import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel } from '@google/generative-ai';
import { logger } from '../utils/logger';
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { AppDataSource } from '../database';
import { encrypt, decrypt } from '../utils/encryption';
import {
  AIMessage,
  AIProviderConfig,
  AISettings,
  AISystemStatus,
  LLMProvider,
  SystemMetrics,
  ResourceStatus,
  RequestMetric
} from '@admin-ai/shared/src/types/ai';
import { randomUUID } from 'crypto';
import { WebSocketService, getWebSocketService } from './websocket.service';
import { AISettingsService } from './aiSettings.service';
import { AppError } from '../utils/error';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { ArrayContains } from 'typeorm';
import { WebSocketEvents } from '@admin-ai/shared/src/types/websocket';

const aiSettingsRepository = AppDataSource.getRepository('AISettings');

interface PathStats {
  path: string;
  count: number;
  avgResponseTime: number;
  errors: number;
  total: number;
}

interface EndpointStats {
  endpoint: string;
  count: number;
  avgResponseTime: number;
  errors: number;
  duration: number;
}

export class AIService extends EventEmitter {
  public static instance: AIService | null = null;
  private isInitialized: boolean = false;
  private isBaseInitialized: boolean = false;
  private providersInitialized: boolean = false;
  private isReady: boolean = false;
  private aiSettingsService: AISettingsService | null = null;
  private webSocketService: WebSocketService | null = null;
  private activeProviders: Map<string, any> = new Map();
  private currentUserId: string | null = null;
  private openai?: OpenAI;
  private gemini?: GoogleGenerativeAI;
  private anthropic?: Anthropic;
  private safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];

  private lastStatusBroadcast: number = 0;
  private readonly STATUS_BROADCAST_DEBOUNCE = 5000; // 5 seconds
  private lastReadyStatus: boolean = false;
  private providers: AIProviderConfig[] = [];
  private status: string = 'idle';

  constructor() {
    super();
  }

  public setAISettingsService(service: AISettingsService) {
    this.aiSettingsService = service;
  }

  public setWebSocketService(wsService: WebSocketService) {
    this.webSocketService = wsService;
  }

  private settings: AISettings = {
    providers: [],
    enableRandomMessages: true,
    messageInterval: 5000,
    systemCommands: []
  };

  private llmClients: {
    openai: OpenAI | undefined;
    gemini: GoogleGenerativeAI | undefined;
    anthropic: Anthropic | undefined;
  } = {
    openai: undefined,
    gemini: undefined,
    anthropic: undefined
  };

  private async generateSystemMessage(
    content: string,
    status: 'success' | 'error' | 'info' | 'warning',
    category: string,
    source: {
      page?: string;
      controller?: string;
      action?: string;
      details?: Record<string, any>;
    },
    userId: string
  ): Promise<void> {
    try {
      // Get the active provider settings
      const provider = await this.getActiveProvider(userId);
      const model = provider?.selectedModel;

      // Generate AI response based on the event
      let aiResponse = content;
      if (provider && this.llmClients[provider.provider as LLMProvider]) {
        try {
          const prompt = `As an AI system administrator, generate a natural response for the following system event:
Event: ${content}
Status: ${status}
Category: ${category}
Source: ${JSON.stringify(source)}

Generate a response that:
1. Explains what happened in natural language
2. Provides context about the operation
3. Suggests any relevant actions if needed
4. Uses a helpful and informative tone`;

          // Use the appropriate LLM client to generate response
          switch (provider.provider) {
            case 'openai':
              const openaiResponse = await (this.llmClients[provider.provider as LLMProvider] as OpenAI).chat.completions.create({
                model: model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
              });
              aiResponse = openaiResponse.choices[0]?.message?.content || content;
              break;
            // Add cases for other providers
          }
        } catch (error) {
          logger.error('Failed to generate AI response:', error);
          // Fall back to original content if AI generation fails
        }
      }

      // Send the AI-generated message if WebSocket service is available
      if (this.webSocketService) {
        const message: WebSocketEvents['ai:message'] = {
          id: crypto.randomUUID(),
          content: aiResponse,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          metadata: {
            type: 'notification',
            status,
            category,
            source,
            timestamp: new Date().toISOString(),
            provider: provider?.provider,
            model: model || undefined,
            read: false
          }
        };
        await this.webSocketService.sendToUser(userId, 'ai:message', message);
      }
    } catch (error) {
      logger.error('Failed to generate system message:', error);
      throw error;
    }
  }

  public async handleSystemEvent(
    event: {
      type: string;
      content: string;
      status: 'success' | 'error' | 'info' | 'warning';
      category: string;
      source: {
        page?: string;
        controller?: string;
        action?: string;
        details?: Record<string, any>;
      };
    },
    userId: string
  ): Promise<void> {
    await this.generateSystemMessage(
      event.content,
      event.status,
      event.category,
      event.source,
      userId
    );
  }

  private async getActiveProvider(userId: string | undefined): Promise<AIProviderConfig | undefined> {
    if (!userId || !this.aiSettingsService) return undefined;
    const providers = await this.aiSettingsService.getAllProviderSettings(userId);
    return providers.find(p => p.isActive);
  }

  private async sendNotification(userId: string, content: string, status: 'success' | 'error' | 'info' | 'warning', provider?: LLMProvider, model?: string) {
    const timestamp = new Date().toISOString();
    const message: WebSocketEvents['ai:message'] = {
      id: randomUUID(),
      content,
      role: 'system',
      timestamp,
      metadata: {
        type: 'notification',
        status,
        category: 'connection',
        source: {
          page: 'AI Service',
          controller: 'AIService',
          action: 'sendNotification'
        },
        timestamp,
        read: false,
        provider,
        model
      }
    };

    if (this.webSocketService) {
      await this.webSocketService.broadcast('ai:message', message);
    }
  }

  private async initializeClient(provider: LLMProvider, apiKey: string): Promise<void> {
    try {
      logger.info(`Initializing ${provider} client...`);
      
      switch (provider) {
        case 'openai':
          this.openai = new OpenAI({ apiKey });
          this.llmClients.openai = this.openai;
          break;
        case 'gemini':
          this.gemini = new GoogleGenerativeAI(apiKey);
          this.llmClients.gemini = this.gemini;
          break;
        case 'anthropic':
          this.anthropic = new Anthropic({ apiKey });
          this.llmClients.anthropic = this.anthropic;
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
      
      logger.info(`${provider} client initialized successfully`);
    } catch (error) {
      logger.error(`Failed to initialize ${provider} client:`, error);
      throw error;
    }
  }

  public async initializeBase(): Promise<void> {
    if (this.isBaseInitialized) return;

    try {
      // Initialize base service
      this.isBaseInitialized = true;
      this.isReady = true;
      
      // Broadcast initial status
      await this.broadcastStatus();
      
      logger.info('AI service base initialization completed');
    } catch (error) {
      logger.error('Failed to initialize AI service base:', error);
      throw error;
    }
  }

  private async broadcastStatus(): Promise<void> {
    if (!this.webSocketService) return;

    const now = Date.now();
    if (now - this.lastStatusBroadcast < this.STATUS_BROADCAST_DEBOUNCE) return;

    const status: WebSocketEvents['ai:status'] = {
      ready: this.isReady
    };

    await this.webSocketService.broadcast('ai:status', status);
    this.lastStatusBroadcast = now;
  }

  public async sendMessage(userId: string, message: AIMessage): Promise<void> {
    if (!this.webSocketService) return;
    await this.webSocketService.sendToUser(userId, 'ai:message', message);
  }

  public async broadcastMessage(message: AIMessage): Promise<void> {
    if (!this.webSocketService) return;
    await this.webSocketService.broadcast('ai:message', message);
  }

  public async updateStatus(status: WebSocketEvents['ai:status']): Promise<void> {
    if (!this.webSocketService) return;
    await this.webSocketService.broadcast('ai:status', status);
  }

  public getStatus(): WebSocketEvents['ai:status'] {
    return {
      ready: this.isReady
    };
  }

  private async notifyUser(userId: string): Promise<void> {
    if (!this.webSocketService) return;

    const status: WebSocketEvents['ai:status'] = {
      ready: this.isReady
    };

    await this.webSocketService.sendToUser(userId, 'ai:status', status);
  }

  // Add missing analysis methods
  public async analyzeMetrics(metrics: SystemMetrics): Promise<any> {
    // Implementation will be added later
    return null;
  }

  public async analyzeError(error: { error: any; context: any }): Promise<any> {
    // Implementation will be added later
    return null;
  }

  public async analyzeData(data: any[]): Promise<any> {
    // Implementation will be added later
    return null;
  }

  public async generateSchema(description: string): Promise<any> {
    // Implementation will be added later
    return null;
  }

  public async generateCrudConfig(schema: any): Promise<any> {
    // Implementation will be added later
    return null;
  }

  public async generateDashboardSuggestions(dataset: any): Promise<any> {
    // Implementation will be added later
    return null;
  }
}

export const getAIService = (): AIService => {
  if (!AIService.instance) {
    AIService.instance = new AIService();
  }
  return AIService.instance;
};