import { EventEmitter } from '../utils/EventEmitter';
import { AIMessage } from '../types/ai';
import { io, Socket } from 'socket.io-client';

interface WebSocketMessage {
  type: string;
  data: any;
}

export class WebSocketService extends EventEmitter {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 3000;
  private url: string;
  private token: string | null = null;
  private isConnecting: boolean = false;

  private constructor() {
    super();
    this.url = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public setToken(token: string | null) {
    this.token = token;
    if (this.socket) {
      // If we're already connected, disconnect and reconnect with new token
      this.disconnect();
      if (token) {
        this.connect();
      }
    }
  }

  public connect() {
    if (this.socket || this.isConnecting) {
      console.warn('Socket.IO connection already exists or is connecting');
      return;
    }

    if (!this.token) {
      console.warn('No token available for Socket.IO connection');
      return;
    }

    try {
      this.isConnecting = true;
      this.socket = io(this.url, {
        auth: {
          token: this.token,
          userId: this.token // Using token as userId for now
        },
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: false // We'll handle reconnection ourselves
      });

      this.socket.on('connect', () => {
        console.info('Socket.IO connection established');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected');
      });

      this.socket.on('disconnect', () => {
        console.warn('Socket.IO connection closed');
        this.isConnecting = false;
        this.socket = null;
        this.emit('disconnected');
        this.handleReconnect();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket.IO error:', error);
        this.isConnecting = false;
        this.emit('error', error);
      });

      this.socket.on('message', (message) => {
        try {
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to handle Socket.IO message:', error);
        }
      });
    } catch (error) {
      console.error('Failed to establish Socket.IO connection:', error);
      this.isConnecting = false;
      this.handleReconnect();
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  public send(type: string, data: any) {
    if (!this.socket?.connected) {
      console.warn('Socket.IO is not connected');
      return;
    }
    this.socket.emit('message', { type, data });
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'ai_message':
        this.emit('ai_message', message.data as AIMessage);
        break;
      case 'metrics_update':
        this.emit('metrics_update', message.data);
        break;
      case 'error_log':
        this.emit('error_log', message.data);
        break;
      case 'system_status':
        this.emit('system_status', message.data);
        break;
      default:
        this.emit(message.type, message.data);
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('max_reconnects_reached');
      return;
    }

    if (!this.token) {
      console.warn('No token available for reconnection');
      return;
    }

    this.reconnectAttempts++;
    console.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      if (this.token) {
        this.connect();
      }
    }, this.reconnectTimeout * this.reconnectAttempts);
  }
}

export const wsService = WebSocketService.getInstance(); 