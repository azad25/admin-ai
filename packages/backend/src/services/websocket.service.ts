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

      this.setupEventHandlers();
      logger.info('WebSocket service initialized with configuration:', {
        path: '/socket.io',
        origins: process.env.NODE_ENV === 'production' 
          ? process.env.FRONTEND_URL 
          : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
        transports: ['websocket', 'polling']
      });

      // Verify connection immediately
      this.checkConnection();
    } catch (error) {
      logger.error('Failed to initialize WebSocket service:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    // Define the authentication middleware
    const authMiddleware: SocketMiddleware = async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          logger.warn('Authentication failed: No token provided');
          next(new Error('Authentication error: No token provided'));
          return;
        }

        try {
          const decoded = await verifyToken(token);
          socket.data.userId = decoded.userId;
          logger.debug('Socket authenticated successfully', {
            socketId: socket.id,
            userId: decoded.userId
          });
          next();
        } catch (error: any) {
          if (error instanceof AppError && 'refreshToken' in error) {
            const refreshError = error as TokenRefreshError;
            // Send the refresh token back to the client
            socket.emit('token:refresh', { token: refreshError.refreshToken });
            // Allow the connection but client should reconnect with new token
            socket.data.userId = refreshError.refreshToken;
            next();
          } else {
            logger.error('Socket authentication error:', error);
            next(new Error('Authentication error: Invalid token'));
          }
        }
      } catch (error) {
        logger.error('Socket middleware error:', error);
        next(new Error('Authentication error: Server error'));
      }
    };

    this.io.use(authMiddleware);

    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;
      logger.info(`Client connected: ${socket.id}`, {
        userId,
        transport: socket.conn.transport.name
      });

      // Initialize AI service with user ID
      if (this.aiService && userId) {
        this.aiService.initialize(userId).catch(error => {
          logger.error('Failed to initialize AI service:', error);
        });
      }

      // Track user's sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)?.add(socket.id);

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

      // Handle monitoring subscription
      socket.on('subscribe:monitoring', async () => {
        if (this.monitoring) {
          const status = await this.monitoring.getSystemStatus();
          this.sendToSocket(socket.id, 'metrics-updated', status);
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

      // Handle AI messages
      socket.on('ai_message', async (message: { content: string }) => {
        try {
          if (!this.aiService) {
            throw new Error('AI service not initialized');
          }

          const timestamp = new Date().toISOString();
          
          // Create user message
          const userMessage: AIMessage = {
            id: crypto.randomUUID(),
            content: message.content,
            role: 'user',
            timestamp,
            metadata: {
              type: 'chat',
              timestamp,
              read: true
            }
          };

          // Send user message to client
          this.sendToUser(userId, {
            type: 'ai_message',
            data: userMessage
          });

          // Process the message and get AI response
          const response = await this.aiService.processMessage(userMessage, userId);
          
          // Send the AI response
          this.sendToUser(userId, {
            type: 'ai_message',
            data: response
          });
        } catch (error) {
          logger.error('Failed to process AI message:', error);
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
            type: 'ai_message',
            data: errorMessage
          });
        }
      });

      // Handle other message types
      socket.on('message', (message: { type: string; data: any }) => {
        try {
          this.handleMessage(socket, message);
        } catch (error) {
          logger.error('Failed to handle socket message:', error);
        }
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

  private handleMessage(socket: Socket, message: { type: string; data: any }): void {
    switch (message.type) {
      case 'ai_message':
        this.handleAIMessage(socket.data.userId, message.data);
        break;
      default:
        logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  private handleAIMessage(userId: string, message: AIMessage): void {
    this.sendToUser(userId, {
      type: 'ai_message',
      data: message
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