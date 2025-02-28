import { io, Socket } from 'socket.io-client';
import { EventEmitter } from '../utils/EventEmitter';
import { AIMessage } from '../types/ai';
import { AuthService } from './auth.service';

interface WebSocketMessage {
  type: string;
  data: any;
}

export class WebSocketService extends EventEmitter {
  private static instance: WebSocketService | null = null;
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 3000;
  private isConnecting: boolean = false;

  private constructor() {
    super();
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  private initialize(): void {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
    const wsPath = import.meta.env.VITE_WS_PATH || '/socket.io';

    try {
      const token = AuthService.getInstance().getToken();
      if (!token) {
        console.error('No authentication token available');
        return;
      }

      this.isConnecting = true;
      this.socket = io(wsUrl, {
        path: wsPath,
        transports: ['websocket'],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectTimeout,
        timeout: 10000,
        autoConnect: false // Don't connect automatically
      });

      // Setup event handlers before connecting
      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.isConnecting = false;
        
        // Don't trigger logout on connection errors
        // Instead, emit an error event that can be handled by the auth context
        this.emit('error', error);
      });

      this.socket.on('token:refresh', (data: { token: string }) => {
        console.info('Received token refresh');
        const authService = AuthService.getInstance();
        authService.setToken(data.token);
        
        // Disconnect and reconnect with new token
        this.disconnect();
        setTimeout(() => {
          this.connect();
        }, 100);
      });

      this.socket.connect(); // Connect after setting up handlers
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      this.isConnecting = false;
      this.handleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.info('Socket.IO connection established');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('Socket.IO connection closed:', reason);
      this.isConnecting = false;
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, likely due to authentication
        const authService = AuthService.getInstance();
        authService.logout();
        window.location.href = '/login';
      } else {
        this.emit('disconnected');
        this.handleReconnect();
      }
    });

    this.socket.on('message', (message) => {
      try {
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to handle Socket.IO message:', error);
      }
    });
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

    const token = AuthService.getInstance().getToken();
    if (!token) {
      console.warn('No token available for reconnection');
      return;
    }

    this.reconnectAttempts++;
    console.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.initialize();
    }, this.reconnectTimeout * this.reconnectAttempts);
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public connect(): void {
    const token = AuthService.getInstance().getToken();
    if (!token) {
      console.warn('Cannot connect: No authentication token available');
      return;
    }
    
    if (this.socket?.connected) {
      // If already connected with same token, do nothing
      if (this.socket.auth?.token === token) {
        return;
      }
      // If token changed, disconnect first
      this.disconnect();
    }
    
    this.initialize();
  }

  public setToken(token: string | null): void {
    // Don't set the token in auth service here - it should be managed by AuthContext
    
    // Disconnect existing socket
    if (this.socket) {
      this.disconnect();
    }
    
    // If we have a token, establish a new connection after a short delay
    // This ensures any auth state updates have completed
    if (token) {
      setTimeout(() => {
        this.connect();
      }, 100);
    }
  }

  public send(type: string, data: any) {
    if (!this.socket?.connected) {
      console.warn('Socket.IO is not connected');
      return;
    }
    this.socket.emit('message', { type, data });
  }

  public on(event: string, callback: (data: any) => void): void {
    super.on(event, callback);
  }

  public off(event: string, callback: (data: any) => void): void {
    if (callback) {
      super.off(event, callback);
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }
}

export const wsService = WebSocketService.getInstance(); 