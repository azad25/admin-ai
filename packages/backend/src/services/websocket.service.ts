import { Server as HTTPServer } from 'http';
import { Server as WebSocketServer, Socket } from 'socket.io';
import { WebSocketEvents } from '@admin-ai/shared/src/types/websocket';
import { logger } from '../utils/logger';
import { verifyToken } from '../utils/auth';
import { AIMessage, AIMessageMetadata, AIAnalysis } from '@admin-ai/shared/src/types/ai';
import { MonitoringService } from './monitoring.service';
import { SystemHealth, SystemMetrics } from '@admin-ai/shared/src/types/metrics';
import { ErrorLog } from '@admin-ai/shared/src/types/error';
import { AIService } from './ai.service';
import { AppError } from '../middleware/errorHandler';
import { LLMProvider } from '@admin-ai/shared/src/types/ai';
import { LogEntry } from '@admin-ai/shared/src/types/logs';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

// Add MetricsController interface
interface MetricsController {
  getSystemHealth(): Promise<SystemHealth>;
  getSystemMetrics(): Promise<SystemMetrics>;
  handleMetricsUpdate(data: any): void;
}

interface TokenRefreshError extends AppError {
  code: 'TOKEN_REFRESH_REQUIRED';
}

type EventName = keyof WebSocketEvents;
type EventData<T extends EventName> = WebSocketEvents[T] extends void ? Record<string, never> : WebSocketEvents[T];

interface CustomSocket extends Socket {
  userId?: string;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private io: WebSocketServer | null = null;
  private userSockets: Map<string, string[]> = new Map();
  private initialized = false;
  private monitoring: MonitoringService | null = null;
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private messageQueue: Map<string, Array<{event: string, data: any}>> = new Map();
  private recentlyProcessedMessages: Set<string> = new Set();
  private readonly MAX_RECENT_MESSAGES = 100;
  private aiService: AIService | null = null;
  private metricsController: MetricsController | null = null;
  private socketMap: Map<string, CustomSocket> = new Map();

  private constructor() {}

  public static async getInstance(): Promise<WebSocketService> {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public isInitialized(): boolean {
    try {
      return this.initialized && this.io !== null;
    } catch (error) {
      logger.error('Error checking WebSocketService initialization:', error);
      return false;
    }
  }

  public async initialize(httpServer: HTTPServer): Promise<void> {
    if (this.io) {
      logger.info('WebSocket server already initialized');
      return;
    }

    if (!httpServer) {
      throw new Error('HTTP server instance is required for WebSocket initialization');
    }

    try {
      this.io = new WebSocketServer(httpServer, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000
      });

      logger.info('WebSocket server created');

      // Initialize immediately without waiting for connections
      this.initialized = true;

      // Set up connection handler
      this.io.on('connection', (socket: CustomSocket) => {
        logger.info(`Client connected: ${socket.id}`);

        // Send initial connection confirmation
        socket.emit('connection_confirmed', {
          status: 'connected',
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });

        // Handle user registration
        socket.on('register_user', (data: string | { userId: string }) => {
          let userId: string;
          
          // Handle both string and object formats for better compatibility
          if (typeof data === 'string') {
            userId = data;
          } else if (data && typeof data === 'object' && 'userId' in data) {
            userId = data.userId;
          } else {
            logger.warn(`Invalid user registration data: ${JSON.stringify(data)}`);
            socket.emit('error', { message: 'Invalid user registration data' });
            return;
          }
          
          if (userId) {
            socket.userId = userId;
            
            // Initialize or get the array of socket IDs for this user
            if (!this.userSockets.has(userId)) {
              this.userSockets.set(userId, []);
            }
            
            const userSocketIds = this.userSockets.get(userId)!;
            if (!userSocketIds.includes(socket.id)) {
              userSocketIds.push(socket.id);
            }
            
            socket.emit('registration_confirmed', {
              status: 'registered',
              userId,
              socketId: socket.id,
              timestamp: new Date().toISOString()
            });
            logger.info(`User ${userId} registered with socket ${socket.id}`);
            
            // Send any queued messages for this user
            this.sendQueuedMessages(userId);
          }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
          logger.info(`Client disconnected: ${socket.id}`);
          if (socket.userId) {
            this.userSockets.delete(socket.userId);
            logger.info(`User ${socket.userId} unregistered from socket ${socket.id}`);
          }
        });

        // Handle ping
        socket.on('ping', () => {
          socket.emit('pong', { timestamp: new Date().toISOString() });
        });
      });

      logger.info('WebSocket server initialized successfully');
    } catch (error) {
      this.initialized = false;
      logger.error('Failed to initialize WebSocket service:', error);
      throw error;
    }
  }

  private handleConnection(socket: CustomSocket): void {
    logger.info(`Client connected: ${socket.id}`);
    
    // Store socket in socketMap
    this.socketMap.set(socket.id, socket);

    // Send initial connection confirmation
    socket.emit('connection:established', {
      status: 'connected',
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    socket.on('register', (userIdOrToken: string) => {
      // Extract userId from token if it's a JWT token
      const userId = this.extractUserIdFromToken(userIdOrToken);
      
      if (!userId) {
        logger.warn(`Invalid user ID or token provided: ${userIdOrToken}`);
        socket.emit('error', { message: 'Invalid user ID or token provided' });
        return;
      }
      
      // Store userId in socket for future reference
      socket.userId = userId;
      
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, []);
      }
      
      // Check if socket ID is already registered for this user
      const userSocketIds = this.userSockets.get(userId) || [];
      if (!userSocketIds.includes(socket.id)) {
        userSocketIds.push(socket.id);
        this.userSockets.set(userId, userSocketIds);
      }
      
      logger.info(`User ${userId} registered with socket ${socket.id}`);
      
      // Debug log to check user sockets map
      logger.debug(`Current user sockets map: ${JSON.stringify(Array.from(this.userSockets.entries()))}`);
      
      // Emit a confirmation back to the client
      socket.emit('register:confirmed', { 
        userId, 
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
      
      // Send any queued messages for this user
      this.sendQueuedMessages(userId);
    });

    // Add a ping handler to keep connections alive
    socket.on('ping', (data: { timestamp: string }) => {
      logger.debug(`Received ping from socket ${socket.id}, timestamp: ${data.timestamp}`);
      
      const responseTimestamp = new Date().toISOString();
      socket.emit('pong', { 
        timestamp: responseTimestamp,
        received: data.timestamp 
      });
      
      logger.debug(`Sent pong to socket ${socket.id}, timestamp: ${responseTimestamp}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
      this.handleDisconnect(socket.id);
    });
  }

  private startConnectionCheck(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    this.connectionCheckInterval = setInterval(() => {
      if (!this.io) return;

      const connectedSockets = this.io.sockets.sockets.size;
      logger.debug(`Active WebSocket connections: ${connectedSockets}`);

      // Clean up any stale socket references
      this.cleanupStaleSockets();
    }, 30000); // Check every 30 seconds
  }

  private cleanupStaleSockets(): void {
    if (!this.io) return;

    const connectedSocketIds = new Set(Array.from(this.io.sockets.sockets.keys()));
    
    for (const [userId, socketIds] of this.userSockets.entries()) {
      const activeSockets = socketIds.filter((socketId: string) => connectedSocketIds.has(socketId));
      
      if (activeSockets.length === 0) {
        this.userSockets.delete(userId);
      } else if (activeSockets.length !== socketIds.length) {
        this.userSockets.set(userId, activeSockets);
      }
    }
    
    // Clean up the socketMap as well
    for (const socketId of this.socketMap.keys()) {
      if (!connectedSocketIds.has(socketId)) {
        this.socketMap.delete(socketId);
      }
    }
  }

  private handleDisconnect(socketId: string): void {
    // Remove socket from socketMap
    this.socketMap.delete(socketId);
    
    for (const [userId, socketIds] of this.userSockets.entries()) {
      const index = socketIds.indexOf(socketId);
      if (index !== -1) {
        socketIds.splice(index, 1);
        if (socketIds.length === 0) {
          this.userSockets.delete(userId);
        }
        logger.info(`Removed socket ${socketId} for user ${userId}`);
      }
    }
  }

  public async sendToUser<T extends EventName>(
    userId: string,
    event: T,
    data: WebSocketEvents[T]
  ): Promise<void> {
    const eventName = String(event);
    const isAIMessage = eventName === 'ai:message' || eventName === 'message';
    
    // Always log AI messages for debugging
    if (isAIMessage && data && typeof data === 'object' && 'id' in data && 'content' in data && 'role' in data && 'metadata' in data) {
      console.log(`Sending ${eventName} to user ${userId}:`, {
        id: data.id,
        content: typeof data.content === 'string' ? data.content.substring(0, 50) + '...' : data.content,
        role: data.role,
        metadata: data.metadata
      });
    }
    
    if (!this.io || !this.initialized) {
      // Only log once per session, not for every message
      if (!isAIMessage) {
        logger.warn(`Cannot send ${eventName} to user ${userId}: WebSocket service not initialized`);
      }
      return;
    }

    // Skip entirely if no sockets and it's an AI message
    const socketIds = this.userSockets.get(userId) || [];
    if (!socketIds.length) {
      // Only log non-AI messages to reduce log spam
      if (!isAIMessage) {
        logger.warn(`No active sockets found for user ${userId}`);
        this.queueMessageForUser(userId, eventName, data);
      } else {
        console.log(`No active sockets found for user ${userId} to send ${eventName}`);
      }
      return;
    }

    let sentSuccessfully = false;

    for (const socketId of socketIds) {
      try {
        console.log(`Emitting ${eventName} to socket ${socketId}`);
        this.io.to(socketId).emit(event, data);
        sentSuccessfully = true;
      } catch (error) {
        console.error(`Failed to send ${eventName} to socket ${socketId}:`, error);
      }
    }

    if (sentSuccessfully) {
      // Only log non-AI messages or log at debug level for AI messages
      if (isAIMessage) {
        console.log(`Successfully sent ${eventName} to user ${userId}`);
      } else {
        logger.info(`Successfully sent ${eventName} to user ${userId}`);
      }
    } else {
      // Only log errors for non-AI messages
      if (!isAIMessage) {
        logger.error(`Failed to send ${eventName} to any socket for user ${userId}`);
        this.queueMessageForUser(userId, eventName, data);
      } else {
        console.error(`Failed to send ${eventName} to any socket for user ${userId}`);
      }
    }
  }

  private queueMessageForUser(userId: string, event: string, data: any): void {
    if (!this.messageQueue.has(userId)) {
      this.messageQueue.set(userId, []);
    }
    
    this.messageQueue.get(userId)!.push({ event, data });
    logger.info(`Message queued for user ${userId}: ${event}`);
    
    // Limit queue size to prevent memory issues
    const userQueue = this.messageQueue.get(userId)!;
    if (userQueue.length > 50) {
      userQueue.shift(); // Remove oldest message if queue gets too large
      logger.warn(`Message queue for user ${userId} exceeded 50 messages, oldest message removed`);
    }
  }

  private sendQueuedMessages(userId: string): void {
    if (!this.messageQueue.has(userId) || !this.userSockets.has(userId)) {
      return;
    }
    
    const userQueue = this.messageQueue.get(userId)!;
    const userSocketIds = this.userSockets.get(userId)!;
    
    if (userQueue.length === 0 || userSocketIds.length === 0) {
      return;
    }
    
    logger.info(`Sending ${userQueue.length} queued messages to user ${userId}`);
    
    // Process all queued messages
    const messagesToSend = [...userQueue]; // Create a copy to avoid modification issues
    this.messageQueue.set(userId, []); // Clear the queue
    
    for (const { event, data } of messagesToSend) {
      let sentSuccessfully = false;
      
      for (const socketId of userSocketIds) {
        try {
          this.io!.to(socketId).emit(event, data);
          sentSuccessfully = true;
          logger.debug(`Successfully sent queued ${event} to socket ${socketId}`);
        } catch (error) {
          logger.error(`Failed to send queued ${event} to socket ${socketId}:`, error);
        }
      }
      
      if (!sentSuccessfully) {
        // Re-queue the message if it couldn't be sent, but only if it's not an AI message
        if (event !== 'ai:message' && event !== 'message') {
          this.queueMessageForUser(userId, event, data);
        }
      }
    }
  }

  public async broadcast<T extends EventName>(
    event: T,
    data: EventData<T>
  ): Promise<void> {
    if (!this.initialized || !this.io) {
      logger.warn('WebSocket service not initialized');
      return;
    }

    // Use proper broadcast method
    this.io.emit(event, data);
    
    // Log broadcast that's not related to metrics or heartbeat
    if (!String(event).includes('metrics:') && !String(event).includes('heartbeat')) {
      logger.info(`Broadcast event ${String(event)} sent to ${this.getConnectedUsersCount()} users`);
    }
  }
  
  // Helper method to count connected users
  public getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  // Helper method to get statistics about connections
  public getConnectionStats(): { users: number, sockets: number } {
    let totalSockets = 0;
    this.userSockets.forEach((socketIds) => {
      totalSockets += socketIds.length;
    });
    
    return {
      users: this.userSockets.size,
      sockets: totalSockets
    };
  }

  private setupMonitoringEvents(): void {
    if (!this.monitoring) return;

    // Listen for monitoring events
    this.monitoring.on('metrics:update', (data: { health: SystemHealth; metrics: SystemMetrics; timestamp: string }) => {
      this.broadcast('metrics:update', data);
    });

    this.monitoring.on('error:new', (error: ErrorLog) => {
      this.broadcast('error:new', error);
    });

    this.monitoring.on('error:analysis', (data: { error: ErrorLog; analysis: AIAnalysis }) => {
      this.broadcast('error:analysis', data);
    });

    this.monitoring.on('error:log', (data: { type: string; data: LogEntry }) => {
      this.broadcast('error:log', data);
    });

    this.monitoring.on('metrics:status', (data: { health: SystemHealth; metrics: SystemMetrics; timestamp: string }) => {
      this.broadcast('metrics:status', data);
    });

    this.monitoring.on('activity:ai', (data: { type: string; data: { userId: string; action: string; timestamp: string; details: Record<string, any>; } }) => {
      this.broadcast('activity:ai', data);
    });

    this.monitoring.on('activity:log', (data: { type: string; data: LogEntry }) => {
      this.broadcast('activity:log', data);
    });

    this.monitoring.on('system:status', (data: { health: SystemHealth; metrics: SystemMetrics; timestamp: string }) => {
      this.broadcast('system:status', data);
    });
  }

  public async shutdown(): Promise<void> {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }

    if (this.io) {
      await new Promise<void>((resolve) => {
        this.io!.close(() => {
          logger.info('WebSocket server closed');
          this.initialized = false;
          this.userSockets.clear();
          this.socketMap.clear();
          WebSocketService.instance = null!;
          resolve();
        });
      });
    }
    logger.info('WebSocket service shut down successfully');
  }

  public getConnectionStatus(): boolean {
    try {
      return this.initialized && this.io !== null;
    } catch (error) {
      logger.error('Error checking WebSocketService connection status:', error);
      return false;
    }
  }

  public setMonitoringService(monitoring: MonitoringService): void {
    this.monitoring = monitoring;
    this.setupMonitoringEvents();
  }

  public setAIService(service: AIService): void {
    this.aiService = service;
  }

  public setMetricsController(controller: MetricsController): void {
    this.metricsController = controller;
    logger.info('Metrics controller set in WebSocket service');
  }

  // Add this helper function to extract userId from JWT token
  private extractUserIdFromToken(token: string): string | null {
    try {
      // Check if the token is a JWT token (starts with ey and contains two dots)
      if (token && token.startsWith('ey') && token.split('.').length === 3) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key') as any;
        return decoded?.userId || null;
      }
      return token; // If not a JWT token, return as is
    } catch (error) {
      logger.error('Failed to decode JWT token:', error);
      return null; // Return null if decoding fails
    }
  }

  public getIO(): WebSocketServer | null {
    return this.io;
  }

  // Fix the Symbol.iterator error by properly iterating over connected sockets
  public getActiveSockets(): CustomSocket[] {
    if (!this.io) return [];
    
    // Convert the socket.io Map-like object to an array of sockets
    const socketArray: CustomSocket[] = [];
    this.io.sockets.sockets.forEach((socket: Socket) => {
      socketArray.push(socket as CustomSocket);
    });
    
    return socketArray;
  }

  public getUserSocket(userId: string): CustomSocket | undefined {
    const socketIds = this.userSockets.get(userId);
    if (socketIds && socketIds.length > 0) {
      return this.socketMap.get(socketIds[0]);
    }
    return undefined;
  }

  public getUserSockets(userId: string): CustomSocket[] {
    const socketIds = this.userSockets.get(userId) || [];
    return socketIds.map(id => this.socketMap.get(id)).filter(socket => socket !== undefined) as CustomSocket[];
  }

  public isUserConnected(userId: string): boolean {
    const socketIds = this.userSockets.get(userId);
    return Boolean(socketIds && socketIds.length > 0);
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  public async broadcastToAll(event: string, data: any): Promise<void> {
    if (this.io) {
      this.io.emit(event, data);
    }
  }
}

export const getWebSocketService = WebSocketService.getInstance;
export const initializeWebSocketService = async (server: HTTPServer): Promise<void> => {
  const wsService = await WebSocketService.getInstance();
  await wsService.initialize(server);
};