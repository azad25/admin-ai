import axios from 'axios';
import { SystemMetrics } from '../types/system';
import { ErrorLog } from '../types/logs';
import { RequestMetric } from '../types/metrics';
import { EventEmitter } from '../utils/EventEmitter';
import { AIMessage } from '@admin-ai/shared/types/ai';
import { wsService } from './websocket.service';
import { logger } from '../utils/logger';
import { store } from '../store';
import {
  setInitialized,
  setProcessing,
  setConnected,
  addMessage,
  setError,
  setProviders,
  clearMessages,
  setLoading
} from '../store/slices/aiSlice';
import { getWebSocketService } from './websocket.service';
import { SimpleEventEmitter } from './SimpleEventEmitter';

export class AIService extends SimpleEventEmitter {
  private static instance: AIService | null = null;
  private isInitialized: boolean = false;
  private isProcessing: boolean = false;
  private messageQueue: AIMessage[] = [];
  private baseUrl: string;
  private wsService = getWebSocketService();
  private userId: string = '';

  private constructor() {
    super();
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    this.setupEventListeners();
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  private setupEventListeners(): void {
    wsService.on('ai:message', (message: AIMessage) => {
      this.handleIncomingMessage(message);
    });

    wsService.on('ai:start', () => {
      this.isProcessing = true;
      store.dispatch(setProcessing(true));
      this.emit('processing', true);
    });

    wsService.on('ai:end', () => {
      this.isProcessing = false;
      store.dispatch(setProcessing(false));
      this.emit('processing', false);
      this.processNextMessage();
    });

    wsService.on('ai:ready', () => {
      this.isInitialized = true;
      store.dispatch(setInitialized(true));
      this.emit('ready');
      this.processNextMessage();
    });

    wsService.on('ai:error', (error: Error) => {
      this.isProcessing = false;
      store.dispatch(setProcessing(false));
      store.dispatch(setError(error.message));
      this.emit('error', error);
    });

    wsService.on('connected', () => {
      store.dispatch(setConnected(true));
    });

    wsService.on('disconnected', () => {
      store.dispatch(setConnected(false));
    });
  }

  private handleIncomingMessage(message: AIMessage): void {
    store.dispatch(addMessage(message));
    this.emit('message', message);
    if (message.metadata?.type === 'chat') {
      this.emit('openPanel');
    }
  }

  private async processNextMessage(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    const message = this.messageQueue.shift();
    if (!message) return;

    this.isProcessing = true;
    store.dispatch(setProcessing(true));
    this.emit('processing', true);

    try {
      wsService.send('ai:message', message);
    } catch (error) {
      logger.error('Failed to send message:', error);
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to send message'));
      this.emit('error', error);
      this.isProcessing = false;
      store.dispatch(setProcessing(false));
      this.emit('processing', false);
    }
  }

  public async sendMessageHttp(content: string): Promise<void> {
    try {
      const response = await fetch('/api/ai/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send message via HTTP:', error);
      throw error;
    }
  }

  public initialize(userId: string): void {
    if (this.isInitialized) return;
    
    this.userId = userId;
    this.isInitialized = true;
    
    logger.info('AI Service initialized with user ID:', userId);

    // Connect to WebSocket with user ID
    if (userId) {
      this.wsService.connect(userId);
      
      // Set up event listener for WebSocket reconnection
      this.wsService.on('connect', () => {
        logger.info('WebSocket reconnected, re-registering user');
        if (this.userId) {
          this.wsService.emit('register_user', this.userId);
        }
      });
    } else {
      logger.warn('Cannot initialize AI service without user ID');
    }
  }

  public sendMessage(message: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.userId) {
          const auth = localStorage.getItem('auth');
          if (auth) {
            try {
              const authData = JSON.parse(auth);
              if (authData.user && authData.user.id) {
                this.userId = authData.user.id;
                logger.info('Retrieved user ID from auth storage:', this.userId);
              }
            } catch (e) {
              logger.error('Failed to parse auth data:', e);
            }
          }
          
          if (!this.userId) {
            logger.error('No user ID available, cannot send message');
            reject(new Error('No user ID available'));
            return;
          }
        }

        // Make sure WebSocket is connected
        if (!this.wsService.isConnected() && this.userId) {
          logger.info('WebSocket not connected, attempting to connect with user ID:', this.userId);
          this.wsService.connect(this.userId);
          
          // Wait for connection to establish
          const connectionTimeout = setTimeout(() => {
            logger.warn('WebSocket connection timeout, falling back to HTTP');
            this.sendMessageHTTP(message).then(resolve).catch(reject);
          }, 3000);
          
          this.wsService.once('connect', () => {
            clearTimeout(connectionTimeout);
            // Continue with WebSocket messaging after connection
            this.sendMessageWebSocket(message).then(resolve).catch(reject);
          });
          
          return;
        }

        // If already connected, send immediately
        if (this.wsService.isConnected()) {
          await this.sendMessageWebSocket(message);
        } else {
          // Fallback to HTTP
          await this.sendMessageHTTP(message);
        }
        
        resolve();
      } catch (error) {
        logger.error('Error sending message:', error);
        reject(error);
      }
    });
  }
  
  private async sendMessageWebSocket(content: string): Promise<void> {
    logger.info('Sending message via WebSocket');
    this.wsService.emit('message', { content });
    
    // Add to our local store
    const message: AIMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date().toISOString(),
      metadata: {
        timestamp: new Date().toISOString(),
        category: 'chat',
        type: 'chat'
      }
    };
    
    store.dispatch(addMessage(message));
  }
  
  private async sendMessageHTTP(content: string): Promise<void> {
    logger.info('Sending message via HTTP fallback');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const response = await fetch('/api/ai/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      // Add to our local store even without response
      const message: AIMessage = {
        id: Date.now().toString(),
        content,
        role: 'user',
        timestamp: new Date().toISOString(),
        metadata: {
          timestamp: new Date().toISOString(),
          category: 'chat',
          type: 'chat'
        }
      };
      
      store.dispatch(addMessage(message));
      
      logger.info('Message sent via HTTP');
    } catch (error) {
      logger.error('Failed to send message via HTTP:', error);
      throw error;
    }
  }

  public isReady(): boolean {
    return this.isInitialized && wsService.isConnected();
  }

  public clearMessages(): void {
    this.messageQueue = [];
    this.isProcessing = false;
    store.dispatch(clearMessages());
    store.dispatch(setProcessing(false));
    this.emit('processing', false);
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const response = await axios.get(`${this.baseUrl}/metrics/system`);
    return response.data;
  }

  async getErrorLogs(): Promise<ErrorLog[]> {
    const response = await axios.get(`${this.baseUrl}/metrics/logs/errors`);
    return response.data;
  }

  async getRequestMetrics(): Promise<RequestMetric[]> {
    const response = await axios.get(`${this.baseUrl}/metrics/requests`);
    return response.data;
  }

  async analyzeErrors(errors: ErrorLog[]): Promise<ErrorLog[]> {
    const response = await axios.post(`${this.baseUrl}/ai/analyze/errors`, { errors });
    return response.data;
  }

  async predictSystemIssues(): Promise<{
    predictions: Array<{
      issue: string;
      probability: number;
      impact: 'high' | 'medium' | 'low';
      suggestedAction: string;
    }>;
  }> {
    const response = await axios.get(`${this.baseUrl}/ai/predict/issues`);
    return response.data;
  }

  async getSystemHealth(): Promise<{
    score: number;
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
  }> {
    const response = await axios.get(`${this.baseUrl}/ai/health`);
    return response.data;
  }

  async optimizeSystem(): Promise<{
    recommendations: Array<{
      type: string;
      description: string;
      impact: string;
      difficulty: string;
    }>;
  }> {
    const response = await axios.get(`${this.baseUrl}/ai/optimize`);
    return response.data;
  }

  async getAIMetrics(): Promise<{
    requestCount: number;
    averageLatency: number;
    errorRate: number;
    modelUsage: Record<string, number>;
  }> {
    const response = await axios.get(`${this.baseUrl}/ai/metrics`);
    return response.data;
  }

  async executeCommand(command: string): Promise<{
    success: boolean;
    output: string;
    error?: string;
  }> {
    const response = await axios.post(`${this.baseUrl}/ai/execute`, { command });
    return response.data;
  }

  async getResourceUsage(): Promise<{
    cpu: number;
    memory: number;
    disk: number;
    network: {
      in: number;
      out: number;
    };
  }> {
    const response = await axios.get(`${this.baseUrl}/ai/resources`);
    return response.data;
  }
}

export const aiService = AIService.getInstance();