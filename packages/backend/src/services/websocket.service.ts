import { Server, Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { logger } from '../utils/logger';
import { verifyToken } from '../utils/auth';
import { AIMessage, AIMessageMetadata } from '@admin-ai/shared/src/types/ai';
import { MonitoringService } from './monitoring.service';
import { ErrorLog, SystemHealth, SystemMetrics } from '../types/metrics';
import { AIService } from './ai.service';
import { EventEmitter } from 'events';
import { AppError } from '../middleware/errorHandler';

interface TokenRefreshError extends AppError {
  refreshToken?: string;
}

type SocketMiddleware = (socket: Socket, next: (err?: Error) => void) => void;

interface WebSocketEvents {
  connected: void;
  disconnected: void;
}

export class WebSocketService extends EventEmitter {
  private static instance: WebSocketService;
  private io: Server | null = null;
  private userSockets: Map<string, Set<string>> = new Map();
  private monitoring: MonitoringService | null = null;
  private aiService: AIService | null = null;
  private isConnected: boolean = false;
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private server: any;

  private constructor() {
    super();
    this.setupConnectionCheck();
  }

  private setupConnectionCheck(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    this.connectionCheckInterval = setInterval(() => {
      this.checkConnection();
    }, 5000);
  }

  private async checkConnection(): Promise<void> {
    try {
      if (this.io && !this.isConnected) {
        this.isConnected = true;
        logger.info('WebSocket service is connected');
        try {
          super.emit('connected');
        } catch (error) {
          logger.error('Failed to emit connected event:', error);
        }
      }
    } catch (error) {
      if (this.isConnected) {
        this.isConnected = false;
        logger.error('WebSocket service connection lost:', error);
        try {
          super.emit('disconnected');
        } catch (error) {
          logger.error('Failed to emit disconnected event:', error);
        }
        this.attemptReconnect();
      }
    }
  }

  private attemptReconnect(): void {
    if (!this.io) return;

    try {
      this.io.close();
      this.io = null;
      setTimeout(() => {
        logger.info('Attempting to reconnect WebSocket service...');
        this.initialize(this.server);
      }, 5000);
    } catch (error) {
      logger.error('Failed to reconnect WebSocket service:', error);
    }
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
      logger.info('WebSocket service instance created');
    }
    return WebSocketService.instance;
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public isInitialized(): boolean {
    return this.io !== null;
  }

  public setMonitoringService(monitoring: MonitoringService): void {
    this.monitoring = monitoring;
    this.setupMonitoringEvents();
  }

  public setAIService(aiService: AIService): void {
    this.aiService = aiService;
    logger.info('AI service set in WebSocket service');
  }

  public initialize(server: any): void {
    if (this.io) {
      logger.warn('WebSocket service is already initialized');
      return;
    }

    try {
      this.server = server;
      this.io = new Server(server, {
        path: '/socket.io',
        cors: {
          origin: process.env.NODE_ENV === 'production' 
            ? process.env.FRONTEND_URL 
            : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          credentials: true,
          allowedHeaders: ['Content-Type', 'Authorization'],
        },
        allowEIO3: true,
        transports: ['websocket', 'polling'],
        pingTimeout: 10000,
        pingInterval: 5000
      });

      // Add authentication middleware
      this.io.use(async (socket, next) => {
        try {
          const token = socket.handshake.auth.token;
          if (!token) {
            logger.warn('No token provided for socket connection');
            return next(new Error('Authentication required'));
          }

          const decoded = await verifyToken(token);
          socket.data.userId = decoded.userId;
          next();
        } catch (error) {
          logger.error('Socket authentication failed:', error);
          next(new Error('Authentication failed'));
        }
      });

      this.setupEventHandlers();
      this.isConnected = true;
      logger.info('WebSocket service initialized successfully');

      // Verify connection immediately
      this.checkConnection();
    } catch (error) {
      logger.error('Failed to initialize WebSocket service:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;
      logger.info(`Client connected: ${socket.id}`, {
        userId,
        transport: socket.conn.transport.name
      });

      // Track user's sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)?.add(socket.id);

      // Initialize AI service with user ID
      if (this.aiService && userId) {
        this.aiService.initialize(userId).catch(error => {
          logger.error('Failed to initialize AI service:', error);
        });
      }

      socket.on('disconnect', (reason) => {
        logger.info(`Client disconnected: ${socket.id}`, {
          userId,
          reason
        });
        this.userSockets.get(userId)?.delete(socket.id);
        if (this.userSockets.get(userId)?.size === 0) {
          this.userSockets.delete(userId);
        }
      });

      // Handle message events
      socket.on('message', (message: { type: string; data: any }) => {
        try {
          this.handleMessage(message);
        } catch (error) {
          logger.error('Error handling message:', error);
        }
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('Socket error:', {
          socketId: socket.id,
          userId,
          error
        });
      });
    });
  }

  private setupMonitoringEvents(): void {
    if (!this.monitoring) return;

    // Listen for monitoring events
    this.monitoring.on('metrics-updated', (data: { health: SystemHealth; metrics: SystemMetrics }) => {
      this.broadcast('metrics-updated', data);
    });

    this.monitoring.on('error-logged', (error: ErrorLog) => {
      this.broadcast('error-logged', error);
    });
  }

  private handleMessage(message: { type: string; data: any }): void {
    try {
      if (!message || !message.type) {
        logger.warn('Invalid message format received');
        return;
      }

      switch (message.type) {
        case 'ai_message':
          this.handleAIMessage(message.data);
          break;
        case 'metrics_update':
          this.handleMetricsUpdate(message.data);
          break;
        case 'error_log':
          this.handleErrorLog(message.data);
          break;
        case 'system_status':
          this.handleSystemStatus(message.data);
          break;
        default:
          // For any other message type, just emit it
          this.emit(message.type, message.data);
      }
    } catch (error) {
      logger.error('Error handling message:', error);
    }
  }

  private async handleAIMessage(data: { content: string; userId: string }): Promise<void> {
    try {
      if (!this.aiService) {
        throw new Error('AI service not initialized');
      }

      // Emit start event to show loading state
      this.sendToUser(data.userId, {
        type: 'ai:start'
      });

      // Create user message
      const userMessage: AIMessage = {
        id: crypto.randomUUID(),
        content: data.content,
        role: 'user',
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'chat',
          timestamp: new Date().toISOString(),
          read: true
        }
      };

      // Send user message to client
      this.sendToUser(data.userId, {
        type: 'ai:message',
        data: userMessage
      });

      // Process through AI service
      const response = await this.aiService.processMessage(userMessage, data.userId);
      
      // Send AI response
      this.sendToUser(data.userId, {
        type: 'ai:message',
        data: response
      });

      // Emit end event to hide loading state
      this.sendToUser(data.userId, {
        type: 'ai:end'
      });
    } catch (error) {
      logger.error('Failed to process AI message:', error);
      this.handleAIError(data.userId, error);
    }
  }

  private handleAIError(userId: string, error: any): void {
    const timestamp = new Date().toISOString();
    const errorMessage: AIMessage = {
      id: crypto.randomUUID(),
      content: 'Sorry, I encountered an error. Please try again.',
      role: 'system',
      timestamp,
      metadata: {
        type: 'notification',
        status: 'error',
        category: 'ai',
        timestamp,
        read: false
      }
    };

    this.sendToUser(userId, {
      type: 'ai:message',
      data: errorMessage
    });

    this.sendToUser(userId, {
      type: 'ai:end'
    });
  }

  public sendToUser(userId: string, data: any): void {
    const userSocketIds = this.userSockets.get(userId);
    if (!userSocketIds) return;

    for (const socketId of userSocketIds) {
      this.sendToSocket(socketId, data.type || 'message', data);
    }
  }

  private sendToSocket(socketId: string, event: string, data: any): void {
    this.io?.to(socketId).emit(event, data);
  }

  public broadcast(event: string, data: any): void {
    this.io?.emit(event, data);
  }

  public shutdown(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
    
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    
    this.isConnected = false;
    logger.info('WebSocket service shut down');
  }
}

export const getWebSocketService = WebSocketService.getInstance;
export const initializeWebSocketService = (server: any): void => {
  const wsService = WebSocketService.getInstance();
  wsService.initialize(server);
};