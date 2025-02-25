import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { verifyToken } from '../utils/auth';
import { AIMessage } from '../types/ai';
import { MonitoringService } from './monitoring.service';
import { ErrorLog, SystemHealth, SystemMetrics } from '../types/metrics';

export class WebSocketService {
  private static instance: WebSocketService;
  private io: Server | null = null;
  private userSockets: Map<string, Set<string>> = new Map();
  private monitoring: MonitoringService | null = null;

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public setMonitoringService(monitoring: MonitoringService): void {
    this.monitoring = monitoring;
    this.setupMonitoringEvents();
  }

  public initialize(server: any): void {
    if (this.io) {
      logger.warn('WebSocket service is already initialized');
      return;
    }

    this.io = new Server(server, {
      path: '/socket.io',
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.setupEventHandlers();
    logger.info('WebSocket service initialized');
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = await verifyToken(token);
        socket.data.userId = decoded.userId;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;
      logger.info(`Client connected: ${socket.id}`);

      // Track user's sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)?.add(socket.id);

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
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
    if (this.io) {
      this.io.close();
      this.io = null;
      this.userSockets.clear();
    }
  }
}

export const getWebSocketService = WebSocketService.getInstance;
export const initializeWebSocketService = (server: any): void => {
  const wsService = WebSocketService.getInstance();
  wsService.initialize(server);
};