import { io, Socket } from 'socket.io-client';
import { EventEmitter } from '../utils/EventEmitter';
import { AIMessage } from '../types/ai';
import { AuthService } from './auth.service';
import { logger } from '../utils/logger';

interface WebSocketMessage {
  type: string;
  data: any;
}

interface SocketAuth {
  token: string;
}

export class WebSocketService extends EventEmitter {
  private static instance: WebSocketService | null = null;
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 3000;
  private isConnecting: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private connectionResolver: (() => void) | null = null;
  private connectionRejecter: ((error: Error) => void) | null = null;

  private constructor() {
    super();
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public connect(): Promise<void> {
    if (this.isConnected()) {
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      this.connectionResolver = resolve;
      this.connectionRejecter = reject;

      try {
        const token = AuthService.getInstance().getToken();
        if (!token) {
          const error = new Error('No authentication token available');
          this.handleConnectionError(error);
          return;
        }

        const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;
        const wsPath = import.meta.env.VITE_WS_PATH || '/socket.io';

        this.socket = io(wsUrl, {
          path: wsPath,
          transports: ['websocket'],
          auth: { token },
          reconnection: false,
          timeout: 10000
        });

        this.setupEventHandlers();
      } catch (error) {
        this.handleConnectionError(error as Error);
      }
    });

    return this.connectionPromise;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.connectionPromise = null;
    this.connectionResolver = null;
    this.connectionRejecter = null;
    this.reconnectAttempts = 0;
    this.emit('disconnected');
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        logger.error('Reconnection failed:', error);
      });
    }, this.reconnectTimeout);
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      logger.info('WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.emit('connected');
      if (this.connectionResolver) {
        this.connectionResolver();
      }
    });

    this.socket.on('disconnect', (reason) => {
      logger.warn('WebSocket disconnected:', reason);
      this.emit('disconnected');
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        // Don't attempt to reconnect for intentional disconnects
        return;
      }
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      logger.error('WebSocket connection error:', error);
      this.handleConnectionError(error);
    });

    this.socket.on('error', (error) => {
      logger.error('WebSocket error:', error);
      this.emit('error', error);
    });

    this.socket.on('message', (message: WebSocketMessage) => {
      this.handleMessage(message);
    });
  }

  private handleConnectionError(error: Error): void {
    this.isConnecting = false;
    this.emit('error', error);
    if (this.connectionRejecter) {
      this.connectionRejecter(error);
    }
    this.connectionPromise = null;
    this.connectionResolver = null;
    this.connectionRejecter = null;
    this.handleReconnect();
  }

  private handleMessage(message: WebSocketMessage) {
    try {
      this.emit(message.type, message.data);
    } catch (error) {
      logger.error('Error handling message:', error);
    }
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public setToken(token: string | null): void {
    if (this.socket) {
      if (token) {
        this.socket.auth = { token };
      }
      // If token is removed, disconnect
      if (!token) {
        this.disconnect();
      }
    }
  }

  public send(type: string, data: any) {
    if (!this.isConnected()) {
      logger.warn('Cannot send message: Socket not connected');
      return;
    }
    this.socket?.emit('message', { type, data });
  }

  public on(event: string, callback: (data: any) => void): void {
    super.on(event, callback);
  }

  public off(event: string, callback: (data: any) => void): void {
    super.off(event, callback);
  }
}

export const wsService = WebSocketService.getInstance(); 