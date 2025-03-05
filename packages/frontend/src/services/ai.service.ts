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
  clearMessages
} from '../store/slices/aiSlice';

export class AIService extends EventEmitter {
  private static instance: AIService | null = null;
  private isInitialized: boolean = false;
  private isProcessing: boolean = false;
  private messageQueue: AIMessage[] = [];
  private baseUrl: string;

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

  public async sendMessage(content: string): Promise<void> {
    if (!wsService.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    const timestamp = new Date().toISOString();
    const message: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp,
      metadata: {
        type: 'chat',
        source: {
          page: 'AI Chat',
          controller: 'AIService',
          action: 'sendMessage'
        },
        timestamp,
        read: false
      }
    };

    this.messageQueue.push(message);
    store.dispatch(addMessage(message));
    this.emit('message', message);

    if (!this.isProcessing) {
      await this.processNextMessage();
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