import { io, Socket } from 'socket.io-client';
import { logger } from '../utils/logger';
import { store } from '../store';
import { setConnected } from '../store/slices/aiSlice';
import { SimpleEventEmitter } from './SimpleEventEmitter';
import { WebSocketEvents } from '../types/websocket';

// Add a function to check if there's a verified provider
const hasVerifiedProvider = (): boolean => {
  try {
    // Get AI settings from the store
    const state = store.getState();
    if (state?.ai?.providers) {
      // Check if any provider is verified
      return state.ai.providers.some(
        (provider: any) => provider.isVerified === true
      );
    }
  } catch (error) {
    logger.debug('Error checking for verified providers:', error);
  }
  return false;
};

export class WebSocketService extends SimpleEventEmitter {
  private static instance: WebSocketService | null = null;
  private socket: Socket | null = null;
  private token: string | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private initialized = false;
  private wsUrl: string;
  private wsPath: string;
  private connectionInProgress = false;
  private isConnecting = false;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private userId: string | null = null;
  private baseUrl: string;
  private path: string;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private connectionEstablishedCallback: (() => void) | null = null;
  private connectionErrorCallback: ((error: Error) => void) | null = null;
  private lastConnectionAttempt: number = 0;
  private connectionDebounceTime: number = 2000; // 2 seconds

  private constructor() {
    super();
    this.wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
    this.wsPath = import.meta.env.VITE_WS_PATH || '/socket.io';
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    this.path = this.wsPath;
    logger.debug('WebSocket service created with config:', { wsUrl: this.wsUrl, wsPath: this.wsPath, path: this.path });
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getSocketId(): string | null {
    return this.socket?.id || null;
  }

  public connect(userId: string): void {
    if (!userId) {
      logger.error('Cannot connect without userId');
      return;
    }

    // Store userId for reconnection attempts
    this.userId = userId;
    
    if (this.socket && this.socket.connected) {
      logger.info('WebSocket already connected, registering user');
      this.socket.emit('register_user', userId);
      this.connected = true;
      return;
    }

    logger.info(`Connecting to WebSocket server with userId: ${userId}...`);
    
    try {
      // Clean up any existing socket
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      
      // Create new socket connection with debug logging
      logger.debug(`Connecting to: ${this.wsUrl} with path: ${this.path}`);
      
      this.socket = io(this.wsUrl, {
        path: this.path,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        timeout: 10000
      });

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (!this.connected && this.socket) {
          logger.error('WebSocket connection timeout after 10 seconds');
          if (this.socket) {
            this.socket.disconnect();
          }
          this.socket = null;
          this.handleConnectionError(new Error('Connection timeout'));
          this.scheduleReconnect();
        }
      }, 10000);

      // Listen for successful connection
      this.socket.on('connect', () => {
        clearTimeout(connectionTimeout);
        logger.info(`WebSocket connected with id: ${this.socket?.id}`);
        this.connected = true;
        
        // Register user with the WebSocket server using the expected format
        if (this.socket && userId) {
          logger.info(`Registering user ${userId} with socket ${this.socket.id}`);
          this.socket.emit('register_user', userId);
        }
        
        // Set up reconnection handlers
        this.socket.io.on("reconnect", (attempt) => {
          logger.info(`Socket reconnected after ${attempt} attempts`);
          if (this.userId) {
            this.socket?.emit('register_user', this.userId);
          }
        });
        
        // Update status and call established callback
        store.dispatch(setConnected(true));
        if (this.connectionEstablishedCallback) {
          this.connectionEstablishedCallback();
        }
        
        // Emit our own connect event
        this.emit('connect');
      });
      
      // Listen for registration confirmation
      this.socket.on('registration_confirmed', (data) => {
        logger.info('Registration confirmed by server', data);
        this.initialized = true;
        this.connected = true;
      });

      this.setupSocketEventHandlers();
    } catch (error) {
      logger.error('Error connecting to WebSocket server:', error);
      this.connected = false;
      this.handleConnectionError(error instanceof Error ? error : new Error(String(error)));
      this.scheduleReconnect();
    }
  }

  private setupSocketEventHandlers(): void {
    if (!this.socket) {
      logger.error('Cannot set up event handlers: socket is null');
      return;
    }

    // Connection events
    this.socket.on('connect_error', (error) => {
      logger.error('WebSocket connect_error:', error);
      logger.error('WebSocket connection details:', { 
        url: this.wsUrl, 
        path: this.path,
        transport: this.socket?.io?.engine?.transport?.name || 'unknown',
        protocol: window.location.protocol,
        readyState: this.socket?.io?.engine?.readyState || 'unknown'
      });
      this.connected = false;
      store.dispatch(setConnected(false));
      this.handleConnectionError(error);
    });

    this.socket.on('disconnect', (reason) => {
      logger.warn(`WebSocket disconnected: ${reason}`);
      logger.debug('WebSocket disconnect details:', {
        url: this.wsUrl,
        path: this.path,
        userId: this.userId,
        reconnectAttempts: this.reconnectAttempts
      });
      this.connected = false;
      store.dispatch(setConnected(false));
      
      // If the disconnection was initiated by the server, try to reconnect
      if (reason === 'io server disconnect' || reason === 'transport close') {
        logger.info('Server initiated disconnect, attempting to reconnect');
        this.scheduleReconnect();
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      logger.info(`WebSocket reconnected after ${attemptNumber} attempts`);
      this.connected = true;
      store.dispatch(setConnected(true));
      
      // Re-register with the server
      if (this.userId) {
        logger.info(`Re-registering user ${this.userId} with WebSocket server`);
        this.socket?.emit('register', this.userId);
      }
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      logger.info(`WebSocket reconnect attempt ${attemptNumber}`);
    });

    this.socket.on('reconnect_error', (error) => {
      logger.error('WebSocket reconnect_error:', error);
      this.handleConnectionError(error);
    });

    this.socket.on('reconnect_failed', () => {
      logger.error('WebSocket reconnect_failed');
      this.connected = false;
      store.dispatch(setConnected(false));
    });

    // Server confirmation of registration
    this.socket.on('register:confirmed', (data) => {
      logger.info('Registration confirmed by server:', data);
    });

    // AI-related events
    this.socket.on('ai:message', (data) => {
      this.emit('ai:message', data);
    });

    this.socket.on('ai:error', (data) => {
      this.emit('ai:error', data);
    });

    this.socket.on('ai:status', (data) => {
      this.emit('ai:status', data);
    });

    // Add handler for 'message' event
    this.socket.on('message', (data) => {
      this.emit('message', data);
    });

    // System events
    this.socket.on('system:metrics', (data) => {
      this.emit('system:metrics', data);
    });

    this.socket.on('system:health', (data) => {
      this.emit('system:health', data);
    });

    this.socket.on('system:error', (data) => {
      logger.error('System error:', data);
      this.emit('system:error', data);
    });

    // Settings events
    this.socket.on('settings:update', (data) => {
      logger.debug('Settings updated:', data);
      this.emit('settings:update', data);
    });

    logger.info('WebSocket event handlers set up');
  }

  private handleConnectionError(error: Error): void {
    // Check if we have a verified provider
    const verifiedProviderExists = hasVerifiedProvider();
    
    // Only update connection status if we don't have a verified provider
    if (!verifiedProviderExists) {
      this.connected = false;
      this.isConnecting = false;
      
      if (this.connectionErrorCallback) {
        this.connectionErrorCallback(error);
      }
      
      this.scheduleReconnect();
    } else {
      // If we have a verified provider, maintain connected state
      logger.info('Verified provider exists, maintaining connected state despite connection error');
      this.connected = true;
      this.isConnecting = false;
      store.dispatch(setConnected(true));
      
      // Still try to reconnect in the background
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached, giving up`);
      // Emit a connection failed event that UI components can listen for
      this.emit('connection:failed', { attempts: this.reconnectAttempts });
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Exponential backoff with jitter to prevent thundering herd
    const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const delay = baseDelay + jitter;
    
    logger.info(`Scheduling reconnect attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      logger.info(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      // Only attempt to reconnect if we have a userId
      if (this.userId) {
        // Emit a reconnecting event that UI components can listen for
        this.emit('connection:reconnecting', { attempt: this.reconnectAttempts, maxAttempts: this.maxReconnectAttempts });
        
        this.connect(this.userId).catch(error => {
          logger.error('Reconnection attempt failed:', error);
          // If this attempt fails, schedule another one
          this.scheduleReconnect();
        });
      } else {
        logger.warn('Cannot reconnect without userId');
        // Try to get userId from store if available
        try {
          // Use type assertion to avoid TypeScript errors
          const state = store.getState() as any;
          const userId = state?.auth?.user?.id || this.userId;
          if (userId) {
            logger.info(`Attempting to reconnect WebSocket for user ${userId}`);
            this.reconnect();
          } else {
            logger.error('No userId available in store, cannot reconnect');
          }
        } catch (error) {
          logger.error('Error retrieving userId from store:', error);
        }
      }
    }, delay);
  }

  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Increase interval to reduce frequency (from 5s to 30s)
    const HEALTH_CHECK_INTERVAL = 30 * 1000;
    
    // Track previous state to only log changes
    let previousConnectedState = this.connected;
    let previousSocketConnected = this.socket?.connected;
    
    this.healthCheckInterval = setInterval(() => {
      const socketConnected = this.socket?.connected || false;
      const stateChanged = 
        previousConnectedState !== this.connected || 
        previousSocketConnected !== socketConnected;
      
      // Only log if state has changed
      if (stateChanged) {
        console.log(
          `WebSocket health check: socket.connected=${socketConnected}, this.connected=${this.connected}`
        );
        
        previousConnectedState = this.connected;
        previousSocketConnected = socketConnected;
      }

      if (!socketConnected) {
        if (hasVerifiedProvider()) {
          // Only log if state changed
          if (stateChanged) {
            console.log('Verified provider exists, maintaining connected state');
          }
          this.connected = true;
        } else {
          this.connected = false;
          this.scheduleReconnect();
        }
      } else {
        this.connected = true;
      }
    }, HEALTH_CHECK_INTERVAL);
  }

  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connected = false;
    this.isConnecting = false;
    this.userId = null;
    logger.debug('Disconnected from WebSocket server');
    store.dispatch(setConnected(false));
  }

  public send<T extends keyof WebSocketEvents>(event: T, data: WebSocketEvents[T]): void {
    if (!this.socket || !this.connected) {
      logger.warn('Cannot send message, not connected to WebSocket server');
      return;
    }
    
    // Only log the event name and message ID if available to reduce log volume
    if (data && typeof data === 'object' && 'id' in data) {
      logger.debug(`Sending ${String(event)} with ID: ${(data as any).id}`);
    } else {
      logger.debug(`Sending ${String(event)} event`);
    }
    
    this.socket.emit(String(event), data);
  }

  public broadcast<T extends keyof WebSocketEvents>(event: T, data: WebSocketEvents[T]): void {
    this.send(event, data);
  }

  public override removeAllListeners(event?: string): this {
    super.removeAllListeners(event);
    if (this.socket) {
      if (event) {
        this.socket.removeAllListeners(event);
      } else {
        this.socket.removeAllListeners();
      }
    }
    return this;
  }

  public override on(event: string, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    
    if (this.socket) {
      this.socket.on(event, listener);
    }
    
    return this;
  }

  public override off(event: string, listener: (...args: any[]) => void): this {
    super.off(event, listener);
    
    if (this.socket) {
      this.socket.off(event, listener);
    }
    
    return this;
  }

  public override emit(event: string, ...args: any[]): boolean {
    if (this.socket) {
      logger.debug(`Emitting WebSocket event: ${event}`);
      this.socket.emit(event, ...args);
      return true;
    }
    return false;
  }

  public isSocketConnected(): boolean {
    return this.connected && this.socket !== null && this.socket.connected;
  }

  public onConnectionEstablished(callback: () => void): void {
    this.connectionEstablishedCallback = callback;
    
    // If already connected, call the callback immediately
    if (this.connected) {
      callback();
    }
  }

  public onConnectionError(callback: (error: Error) => void): void {
    this.connectionErrorCallback = callback;
  }

  private reconnect(): void {
    if (this.userId) {
      logger.info('Forcing reconnection...');
      // Reset connection state
      this.connected = false;
      this.connectionInProgress = false;
      this.isConnecting = false;
      
      // Disconnect existing socket if any
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      
      // Attempt to connect again
      this.connect(this.userId).catch(error => {
        logger.error('Forced reconnection failed:', error);
        this.scheduleReconnect();
      });
    } else {
      logger.warn('Cannot reconnect without userId');
    }
  }

  private getSocketUrl(): string {
    return `${this.wsUrl}${this.path}`;
  }

  public sendMessage(event: string, data: any): void {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    } else {
      logger.error('Cannot send message, socket not connected');
      // Try to connect automatically
      if (this.userId) {
        this.connect(this.userId);
      }
    }
  }
}

export const getWebSocketService = (): WebSocketService => {
  return WebSocketService.getInstance();
};

export const initializeService = () => {
  return WebSocketService.getInstance();
};

// Add this line to maintain backward compatibility with existing imports
export const wsService = WebSocketService.getInstance();

// Add this to the global window object for debugging
if (typeof window !== 'undefined') {
  (window as any).wsService = wsService;
}
