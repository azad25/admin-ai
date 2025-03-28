import { Server, Socket } from 'socket.io';
import { logger } from './logger';
import { EventService } from './events';
import { CacheService } from './cache';

export interface WebSocketClient {
  id: string;
  userId?: string;
  socket: Socket;
  connectedAt: Date;
  lastActivity: Date;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private io: Server;
  private eventService: EventService;
  private cacheService: CacheService;
  private clients: Map<string, WebSocketClient> = new Map();
  private isInitialized: boolean = false;
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private readonly CLIENT_TIMEOUT = 60000; // 1 minute

  private constructor(eventService: EventService, cacheService: CacheService) {
    this.eventService = eventService;
    this.cacheService = cacheService;
  }

  public static getInstance(eventService: EventService, cacheService: CacheService): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService(eventService, cacheService);
    }
    return WebSocketService.instance;
  }

  public initialize(server: any): void {
    if (this.isInitialized) return;

    try {
      this.io = new Server(server, {
        cors: {
          origin: process.env.FRONTEND_URL || 'http://localhost:5173',
          methods: ['GET', 'POST'],
          credentials: true
        },
        pingTimeout: this.CLIENT_TIMEOUT,
        pingInterval: this.PING_INTERVAL
      });

      this.setupEventHandlers();
      this.startCleanupInterval();
      this.isInitialized = true;
      logger.info('WebSocket service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize WebSocket service:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    this.io.on('connection', this.handleConnection.bind(this));
    this.io.on('disconnect', this.handleDisconnection.bind(this));
    this.io.on('error', this.handleError.bind(this));

    // Register event handlers for system events
    this.eventService.onEvent('system.metrics.update', this.handleMetricsUpdate.bind(this));
    this.eventService.onEvent('system.health.check', this.handleHealthCheck.bind(this));
    this.eventService.onEvent('system.notification', this.handleNotification.bind(this));
  }

  private async handleConnection(socket: Socket): Promise<void> {
    try {
      const client: WebSocketClient = {
        id: socket.id,
        socket,
        connectedAt: new Date(),
        lastActivity: new Date()
      };

      this.clients.set(socket.id, client);
      logger.info(`Client connected: ${socket.id}`);

      // Set up socket event handlers
      socket.on('authenticate', this.handleAuthentication.bind(this));
      socket.on('message', this.handleMessage.bind(this));
      socket.on('ping', this.handlePing.bind(this));
      socket.on('error', this.handleSocketError.bind(this));

      // Send initial connection success message
      socket.emit('connection:success', {
        id: socket.id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Error handling connection for socket ${socket.id}:`, error);
      socket.disconnect(true);
    }
  }

  private handleDisconnection(socket: Socket): void {
    try {
      const client = this.clients.get(socket.id);
      if (client) {
        this.clients.delete(socket.id);
        logger.info(`Client disconnected: ${socket.id}`);
      }
    } catch (error) {
      logger.error(`Error handling disconnection for socket ${socket.id}:`, error);
    }
  }

  private handleError(error: Error): void {
    logger.error('WebSocket server error:', error);
  }

  private async handleAuthentication(socket: Socket, data: { userId: string }): Promise<void> {
    try {
      const client = this.clients.get(socket.id);
      if (client) {
        client.userId = data.userId;
        client.lastActivity = new Date();
        this.clients.set(socket.id, client);

        // Cache the client's user ID
        await this.cacheService.set(`ws:client:${socket.id}`, data.userId, { ttl: 3600 });

        socket.emit('authentication:success', {
          userId: data.userId,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error(`Error handling authentication for socket ${socket.id}:`, error);
      socket.emit('authentication:error', {
        message: 'Authentication failed',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async handleMessage(socket: Socket, message: WebSocketMessage): Promise<void> {
    try {
      const client = this.clients.get(socket.id);
      if (!client) return;

      client.lastActivity = new Date();
      this.clients.set(socket.id, client);

      // Process the message
      await this.processMessage(socket, message);
    } catch (error) {
      logger.error(`Error handling message for socket ${socket.id}:`, error);
      socket.emit('message:error', {
        message: 'Failed to process message',
        timestamp: new Date().toISOString()
      });
    }
  }

  private handlePing(socket: Socket): void {
    try {
      const client = this.clients.get(socket.id);
      if (client) {
        client.lastActivity = new Date();
        this.clients.set(socket.id, client);
        socket.emit('pong', { timestamp: new Date().toISOString() });
      }
    } catch (error) {
      logger.error(`Error handling ping for socket ${socket.id}:`, error);
    }
  }

  private handleSocketError(socket: Socket, error: Error): void {
    logger.error(`Socket error for ${socket.id}:`, error);
  }

  private async processMessage(socket: Socket, message: WebSocketMessage): Promise<void> {
    // Process different message types
    switch (message.type) {
      case 'chat':
        await this.handleChatMessage(socket, message);
        break;
      case 'command':
        await this.handleCommand(socket, message);
        break;
      case 'notification':
        await this.handleNotificationMessage(socket, message);
        break;
      default:
        logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  private async handleChatMessage(socket: Socket, message: WebSocketMessage): Promise<void> {
    // Implement chat message handling
    logger.info(`Chat message from ${socket.id}:`, message);
  }

  private async handleCommand(socket: Socket, message: WebSocketMessage): Promise<void> {
    // Implement command handling
    logger.info(`Command from ${socket.id}:`, message);
  }

  private async handleNotificationMessage(socket: Socket, message: WebSocketMessage): Promise<void> {
    // Implement notification handling
    logger.info(`Notification for ${socket.id}:`, message);
  }

  private async handleMetricsUpdate(event: any): Promise<void> {
    try {
      const metrics = event.payload;
      this.io.emit('metrics:update', {
        metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error handling metrics update:', error);
    }
  }

  private async handleHealthCheck(event: any): Promise<void> {
    try {
      const health = event.payload;
      this.io.emit('health:status', {
        health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error handling health check:', error);
    }
  }

  private async handleNotification(event: any): Promise<void> {
    try {
      const notification = event.payload;
      if (notification.userId) {
        // Send to specific user
        this.sendToUser(notification.userId, 'notification', notification);
      } else {
        // Broadcast to all connected clients
        this.io.emit('notification', {
          notification,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Error handling notification:', error);
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupInactiveClients();
    }, this.CLIENT_TIMEOUT);
  }

  private async cleanupInactiveClients(): Promise<void> {
    try {
      const now = new Date();
      for (const [id, client] of this.clients.entries()) {
        const inactiveTime = now.getTime() - client.lastActivity.getTime();
        if (inactiveTime > this.CLIENT_TIMEOUT) {
          client.socket.disconnect(true);
          this.clients.delete(id);
          await this.cacheService.delete(`ws:client:${id}`);
          logger.info(`Cleaned up inactive client: ${id}`);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up inactive clients:', error);
    }
  }

  public sendToUser(userId: string, type: string, payload: any): void {
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        client.socket.emit(type, {
          payload,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  public broadcast(type: string, payload: any, exclude?: string[]): void {
    this.io.emit(type, {
      payload,
      timestamp: new Date().toISOString()
    });
  }

  public async cleanup(): Promise<void> {
    try {
      // Remove event handlers
      this.eventService.removeEventHandler('system.metrics.update', this.handleMetricsUpdate);
      this.eventService.removeEventHandler('system.health.check', this.handleHealthCheck);
      this.eventService.removeEventHandler('system.notification', this.handleNotification);

      // Disconnect all clients
      for (const client of this.clients.values()) {
        client.socket.disconnect(true);
      }
      this.clients.clear();

      this.isInitialized = false;
      logger.info('WebSocket service cleaned up successfully');
    } catch (error) {
      logger.error('Error cleaning up WebSocket service:', error);
      throw error;
    }
  }
} 