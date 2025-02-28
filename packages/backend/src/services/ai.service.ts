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
  private wsService: WebSocketService | null = null;
  private aiSettingsService: AISettingsService;
  private openai?: OpenAI;
  private gemini?: GoogleGenerativeAI;
  private anthropic?: Anthropic;
  private isReady: boolean = false;
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

  constructor() {
    super();
    this.aiSettingsService = new AISettingsService();
  }

  public setWebSocketService(wsService: WebSocketService): void {
    this.wsService = wsService;
  }

  private settings: AISettings = {
    providers: [],
    enableRandomMessages: true,
    messageInterval: 5000,
    systemCommands: []
  };

  private llmClients: {
    openai: OpenAI | undefined;
    gemini: GenerativeModel | undefined;
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
      if (this.wsService) {
        this.wsService.sendToUser(userId, {
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
        });
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
    if (!userId) return undefined;
    const providers = await this.aiSettingsService.getAllProviderSettings(userId);
    return providers.find(p => p.isActive);
  }

  private async sendNotification(userId: string, content: string, status: 'success' | 'error' | 'info' | 'warning', provider?: LLMProvider, model?: string) {
    const message: AIMessage = {
      id: randomUUID(),
      content,
      role: 'system',
      timestamp: new Date().toISOString(),
      metadata: {
        type: 'notification',
        status,
        timestamp: new Date().toISOString(),
        provider,
        model,
        category: 'connection'
      }
    };

    if (this.wsService) {
      this.wsService.sendToUser(userId, message);
    }
  }

  private async initializeClient(provider: LLMProvider, apiKey: string): Promise<void> {
    try {
      logger.info(`Initializing ${provider} client...`);
      
      switch (provider) {
        case 'openai':
          this.llmClients.openai = new OpenAI({ apiKey });
          break;
        case 'gemini':
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            safetySettings: this.safetySettings,
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048
            }
          });
          this.llmClients.gemini = model;
          break;
        case 'anthropic':
          this.llmClients.anthropic = new Anthropic({ apiKey });
          break;
      }
      
      logger.info(`Successfully initialized ${provider} client`);
    } catch (error) {
      logger.error(`Failed to initialize ${provider} client:`, error);
      throw error;
    }
  }

  async verifyProvider(provider: LLMProvider, apiKey: string, userId: string): Promise<AIProviderConfig> {
    try {
      let availableModels: string[] = [];

      // Initialize the client
      await this.initializeClient(provider, apiKey);
      const client = this.llmClients[provider as keyof typeof this.llmClients];

      if (!client) {
        throw new Error(`Failed to initialize client for ${provider}`);
      }

      switch (provider) {
        case 'openai':
          const openaiClient = client as OpenAI;
          const openaiModels = await openaiClient.models.list();
          availableModels = openaiModels.data
            .filter(model => model.id.startsWith('gpt'))
            .map(model => model.id);
          break;

        case 'gemini':
          availableModels = ['gemini-2.0-flash'];
          break;

        case 'anthropic':
          availableModels = ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
          break;

        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      await this.sendNotification(
        userId,
        `Successfully connected to ${provider}`,
        'success',
        provider
      );

      return {
        provider,
        apiKey,
        availableModels,
        selectedModel: availableModels[0],
        isActive: true,
        isVerified: true,
        lastVerified: new Date()
      };

    } catch (error: unknown) {
      console.error(`Error verifying ${provider}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      await this.sendNotification(
        userId,
        `Failed to connect to ${provider}: ${errorMessage}`,
        'error',
        provider
      );

      throw new Error(`Failed to verify ${provider}: ${errorMessage}`);
    }
  }

  async getProviderSettings(userId: string): Promise<AIProviderConfig[]> {
    try {
      const settings = await aiSettingsRepository.find({
        where: { userId }
      });

      return settings.map(setting => ({
        provider: setting.provider,
        apiKey: '********', // Don't send the actual key
        isVerified: true,
        availableModels: setting.settings.availableModels,
        selectedModel: setting.selectedModel,
        lastVerified: setting.settings.lastVerified
      }));
    } catch (error) {
      logger.error('Error fetching provider settings:', error);
      throw error;
    }
  }

  async sendMessage(content: string, role: AIMessage['role'] = 'user'): Promise<AIMessage> {
    const message: AIMessage = {
      id: randomUUID(),
      content,
      role,
      timestamp: new Date().toISOString(),
      metadata: {
        type: 'chat',
        model: undefined,
        timestamp: new Date().toISOString(),
        read: false
      }
    };

    return message;
  }

  async processMessage(message: AIMessage, userId: string): Promise<AIMessage> {
    try {
      // Get current settings
      const settings = await aiSettingsRepository.findOne({
        where: { userId, isActive: true }
      });

      if (!settings) {
        throw new Error('No active AI provider configured');
      }

      const { provider, selectedModel } = settings;
      
      // Initialize client if not already initialized
      if (!this.llmClients[provider as keyof typeof this.llmClients]) {
        const apiKey = decrypt(settings.apiKey);
        await this.initializeClient(provider, apiKey);
      }

      let response: AIMessage;

      switch (provider) {
        case 'openai': {
          if (!this.llmClients.openai) {
            throw new Error('OpenAI client not initialized');
          }
          const completion = await this.llmClients.openai.chat.completions.create({
            model: selectedModel,
            messages: [
              {
                role: message.role === 'system' ? 'system' :
                      message.role === 'assistant' ? 'assistant' : 'user',
                content: message.content
              }
            ]
          });

          response = {
            id: randomUUID(),
            role: 'assistant',
            content: completion.choices[0]?.message?.content || 'No response generated',
            timestamp: new Date().toISOString(),
            metadata: {
              type: 'chat',
              source: {
                page: 'AI Chat',
                controller: 'AIService',
                action: 'processMessage'
              },
              model: typeof selectedModel === 'string' ? selectedModel : selectedModel?.modelName || undefined,
              timestamp: new Date().toISOString(),
              read: false
            }
          };
          break;
        }

        case 'gemini': {
          if (!this.llmClients.gemini) {
            throw new Error('Gemini client not initialized');
          }
          const result = await this.llmClients.gemini.generateContent(message.content);
          const text = result.response.text();

          response = {
            id: randomUUID(),
            role: 'assistant',
            content: text,
            timestamp: new Date().toISOString(),
            metadata: {
              type: 'chat',
              source: {
                page: 'AI Chat',
                controller: 'AIService',
                action: 'processMessage'
              },
              model: selectedModel || 'gemini-2.0-flash',
              timestamp: new Date().toISOString(),
              read: false,
              provider: 'gemini'
            }
          };
          break;
        }

        case 'anthropic': {
          if (!this.llmClients.anthropic) {
            throw new Error('Anthropic client not initialized');
          }
          const result = await this.llmClients.anthropic.messages.create({
            model: selectedModel || 'claude-3-sonnet-20240229',
            max_tokens: 1000,
            messages: [
              {
                role: message.role === 'system' ? 'user' :
                      message.role === 'assistant' ? 'assistant' : 'user',
                content: message.content
              }
            ]
          });

          const content = result.content.map(c => (c as { type: string; text: string }).text).join('\n');

          response = {
            id: randomUUID(),
            role: 'assistant',
            content: content || 'No response generated',
            timestamp: new Date().toISOString(),
            metadata: {
              type: 'chat',
              source: {
                page: 'AI Chat',
                controller: 'AIService',
                action: 'processMessage'
              },
              model: typeof selectedModel === 'string' ? selectedModel : selectedModel?.modelName || undefined,
              timestamp: new Date().toISOString(),
              read: false
            }
          };
          break;
        }

        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      return response;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error processing message:', error);

      await this.sendNotification(
        userId,
        `Failed to process message: ${errorMessage}`,
        'error'
      );

      throw new Error(`Failed to process message: ${errorMessage}`);
    }
  }

  async executeCommand(command: string, args?: Record<string, any>): Promise<AIMessage> {
    const message: AIMessage = {
      id: randomUUID(),
      content: `Executing command: ${command}`,
      role: 'system',
      timestamp: new Date().toISOString(),
      metadata: {
        type: 'command',
        command,
        status: 'info',
        timestamp: new Date().toISOString()
      }
    };

    return message;
  }

  async getSystemStatus(userId?: string): Promise<AISystemStatus> {
    try {
      const providers = await this.aiSettingsService.getAllProviderSettings(userId ?? '');
      const activeProviders = providers
        .filter(p => p.isActive && p.isVerified)
        .map(p => ({
          provider: p.provider,
          model: p.selectedModel || 'default'
        }));

      const hasActiveProviders = activeProviders.length > 0;
      const wsInitialized = this.wsService?.isInitialized() || false;
      const wsConnected = this.wsService?.getConnectionStatus() || false;

      const isReady = !hasActiveProviders || (hasActiveProviders && wsInitialized && wsConnected);

      const status: AISystemStatus = {
        ready: isReady,
        connected: wsConnected,
        initialized: wsInitialized,
        hasProviders: hasActiveProviders,
        activeProviders
      };

      logger.info('AI system status:', {
        ...status,
        wsService: !!this.wsService,
        isReady: this.isReady
      });

      return status;
    } catch (error) {
      logger.error('Failed to get system status:', error);
      return {
        ready: false,
        connected: false,
        initialized: false,
        hasProviders: false,
        activeProviders: []
      };
    }
  }

  getSettings(): AISettings {
    return this.settings;
  }

  updateSettings(settings: Partial<AISettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  async generateSchema(input: string): Promise<any> {
    try {
      const settings = await aiSettingsRepository.findOne({
        where: { isActive: true }
      });

      if (!settings) {
        throw new Error('No active AI provider configured');
      }

      const { provider } = settings;
      
      if (provider === 'gemini') {
        return await this.generateContent(input).then(JSON.parse);
      }

      throw new Error('Unsupported provider for schema generation');
    } catch (error) {
      logger.error('Error generating schema:', error);
      throw error;
    }
  }

  async generateCrudConfig(schema: Record<string, unknown>): Promise<Record<string, unknown>> {
    try {
      const prompt = `Given this database schema: ${JSON.stringify(schema)},
        generate a CRUD page configuration including:
        - Table columns with appropriate formatting
        - Form fields with validations
        - Default sorting
        - Searchable fields
        Return only the JSON configuration object without any explanation.`;

      return await this.generateContent(prompt).then(JSON.parse);
    } catch (error) {
      logger.error('Error generating CRUD config:', error);
      throw new Error('Failed to generate CRUD configuration');
    }
  }

  async analyzeData(data: unknown[]): Promise<Record<string, unknown>> {
    try {
      const prompt = `Analyze this dataset and provide insights: ${JSON.stringify(data)}.
        Include:
        - Basic statistics
        - Trends
        - Anomalies
        - Recommendations
        Return the analysis as a JSON object without any explanation.`;

      return await this.generateContent(prompt).then(JSON.parse);
    } catch (error) {
      logger.error('Error analyzing data:', error);
      throw new Error('Failed to analyze data');
    }
  }

  async generateDashboardSuggestions(data: unknown[]): Promise<Record<string, unknown>> {
    try {
      const prompt = `Given this dataset: ${JSON.stringify(data)},
        suggest dashboard widgets that would be useful for visualization.
        Include:
        - Widget types (chart, table, metric, etc.)
        - Configurations
        - Layouts
        Return only the JSON configuration object without any explanation.`;

      return await this.generateContent(prompt).then(JSON.parse);
    } catch (error) {
      logger.error('Error generating dashboard suggestions:', error);
      throw new Error('Failed to generate dashboard suggestions');
    }
  }

  public async initialize(): Promise<void> {
    if (this.isReady) {
      logger.info('AI service is already initialized');
      return;
    }

    try {
      logger.info('Starting AI service initialization...');
      
      // Verify database connection first
      try {
        await AppDataSource.query('SELECT 1');
        logger.info('Database connection verified for AI service');
      } catch (error) {
        logger.error('Database connection failed for AI service:', error);
        throw new Error('Database connection required for AI service initialization');
      }

      // Initialize settings service first
      await this.aiSettingsService.initialize();
      logger.info('AI settings service initialized');
      
      // Wait for settings service to be ready
      await this.aiSettingsService.waitForReady();
      logger.info('AI settings service is ready');
      
      // Setup AI components
      await this.setupAIComponents();
      logger.info('AI components setup completed');

      // Wait for WebSocket service if we have active providers
      const providers = await this.aiSettingsService.getAllProviderSettings();
      const hasActiveProviders = providers.some(p => p.isActive && p.isVerified);

      logger.info('Checking WebSocket requirements', {
        hasActiveProviders,
        wsServiceAvailable: !!this.wsService
      });

      if (hasActiveProviders) {
        if (!this.wsService) {
          logger.warn('WebSocket service not available but required for active providers');
          return;
        }

        // Wait for WebSocket to be ready with a timeout
        const wsTimeout = 10000; // 10 seconds
        logger.info('Waiting for WebSocket service to be ready...');
        
        const wsReady = await Promise.race([
          new Promise<boolean>(resolve => {
            const checkWs = () => {
              if (this.wsService?.isInitialized()) {
                resolve(true);
              }
            };
            const interval = setInterval(checkWs, 100);
            setTimeout(() => {
              clearInterval(interval);
              resolve(false);
            }, wsTimeout);
          }),
          new Promise<boolean>(resolve => setTimeout(() => resolve(false), wsTimeout))
        ]);

        if (!wsReady) {
          logger.error('WebSocket service failed to initialize within timeout');
          return;
        }
        
        logger.info('WebSocket service is ready');
      }
      
      // Mark as ready
      this.isReady = true;
      logger.info('AI service is ready');
      
      // Broadcast initial status
      if (this.wsService?.isInitialized()) {
        const status = await this.getSystemStatus();
        this.wsService.broadcast('ai:status', status);
        if (status.ready) {
          this.wsService.broadcast('ai:ready', { ready: true });
        }
        logger.info('Broadcasted initial status', status);
      }

      logger.info('AI service initialization completed successfully', {
        isReady: this.isReady,
        hasActiveProviders,
        wsInitialized: this.wsService?.isInitialized() || false
      });
    } catch (error) {
      logger.error('Failed to initialize AI service:', error);
      this.isReady = false;
      throw error;
    }
  }

  private async setupAIComponents(): Promise<void> {
    try {
      logger.info('Starting AI components setup...');
      
      // Wait for settings service to be ready
      await this.aiSettingsService.waitForReady();
      logger.info('AI settings service is ready');
      
      // Get active provider settings
      const providers = await this.aiSettingsService.getAllProviderSettings();
      logger.info('Retrieved provider settings', {
        totalProviders: providers.length,
        activeProviders: providers.filter(p => p.isActive && p.isVerified).length
      });
      
      // Initialize each provider client
      for (const provider of providers) {
        try {
          if (provider.isActive && provider.isVerified) {
            logger.info(`Initializing provider ${provider.provider}`);
            
            // Decrypt the API key before initializing
            const decryptedKey = decrypt(provider.apiKey);
            await this.initializeClient(provider.provider, decryptedKey);
            
            logger.info(`Successfully initialized ${provider.provider} client`);
          }
        } catch (error) {
          logger.error(`Failed to initialize provider ${provider.provider}:`, error);
          // Continue with other providers even if one fails
        }
      }

      logger.info('AI components setup completed successfully');
    } catch (error) {
      logger.error('Failed to setup AI components:', error);
      throw error;
    }
  }

  public async executeAction(action: string, params: any): Promise<any> {
    if (!this.isReady) {
      throw new Error('AI service is not initialized');
    }

    try {
      logger.info('Executing AI action', { action, params });

      // Emit request event
      this.emit('request', { action, params });

      // Execute the action
      const result = await this.processAction(action, params);

      // Emit response event
      this.emit('response', { action, params, result });

      return result;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async processAction(action: string, params: any): Promise<any> {
    // Implement action processing logic
    switch (action) {
      case 'analyze_text':
        return await this.analyzeText(params);
      case 'generate_response':
        return await this.generateResponse(params);
      case 'get_recommendations':
        return await this.getRecommendations(params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async analyzeText(params: any): Promise<any> {
    // Implement text analysis
    return {
      sentiment: 'positive',
      entities: [],
      keywords: []
    };
  }

  private async generateResponse(params: any): Promise<any> {
    // Implement response generation
    return {
      response: 'Generated response',
      confidence: 0.95
    };
  }

  public async getSystemRecommendations(): Promise<any> {
    try {
      // Analyze system state and generate recommendations
      const recommendations = await this.analyzeSystemState();
      return recommendations;
    } catch (error) {
      logger.error('Failed to get system recommendations', { error });
      throw error;
    }
  }

  private async analyzeSystemState(): Promise<any> {
    // Implement system state analysis
    return {
      performance: {
        suggestions: ['Optimize database queries', 'Scale up resources']
      },
      security: {
        suggestions: ['Update dependencies', 'Enable rate limiting']
      },
      maintenance: {
        suggestions: ['Clean up old logs', 'Update configurations']
      }
    };
  }

  public async shutdown(): Promise<void> {
    try {
      // Cleanup AI resources
      this.isReady = false;
      this.emit('shutdown');
      logger.info('AI service shut down successfully');
    } catch (error) {
      logger.error('Error during AI service shutdown', { error });
      throw error;
    }
  }

  public async analyzeMetrics(metrics: SystemMetrics) {
    try {
      // Return basic metrics if service is not ready
      if (!this.isReady || !this.llmClients.gemini) {
        return {
          performance: {
            cpuAnalysis: this.analyzeCPUUsageBasic(metrics.cpuUsage),
            memoryAnalysis: this.analyzeMemoryUsageBasic(metrics.memoryUsage),
            recommendations: this.generateBasicRecommendations(metrics)
          },
          trends: {
            requests: this.analyzeRequestTrends(metrics),
            errors: this.analyzeErrorTrends(metrics),
            usage: this.analyzeUsageTrends(metrics)
          }
        };
      }

      // Full analysis with AI if service is ready
      return {
        performance: {
          cpuAnalysis: await this.analyzeCPUUsage(metrics.cpuUsage),
          memoryAnalysis: await this.analyzeMemoryUsage(metrics.memoryUsage),
          recommendations: await this.generatePerformanceRecommendations(metrics)
        },
        trends: {
          requests: this.analyzeRequestTrends(metrics),
          errors: this.analyzeErrorTrends(metrics),
          usage: this.analyzeUsageTrends(metrics)
        }
      };
    } catch (error) {
      logger.error('Failed to analyze metrics:', error);
      // Fallback to basic analysis on error
      return {
        performance: {
          cpuAnalysis: this.analyzeCPUUsageBasic(metrics.cpuUsage),
          memoryAnalysis: this.analyzeMemoryUsageBasic(metrics.memoryUsage),
          recommendations: this.generateBasicRecommendations(metrics)
        },
        trends: {
          requests: this.analyzeRequestTrends(metrics),
          errors: this.analyzeErrorTrends(metrics),
          usage: this.analyzeUsageTrends(metrics)
        }
      };
    }
  }

  private analyzeCPUUsageBasic(cpuUsage: number) {
    const status = cpuUsage > 80 ? 'critical' : cpuUsage > 60 ? 'warning' : 'normal';
    return {
      status,
      trend: this.calculateTrend([cpuUsage]),
      recommendations: this.generateBasicCPURecommendations(cpuUsage)
    };
  }

  private analyzeMemoryUsageBasic(memoryUsage: number) {
    const status = memoryUsage > 85 ? 'critical' : memoryUsage > 70 ? 'warning' : 'normal';
    return {
      status,
      trend: this.calculateTrend([memoryUsage]),
      recommendations: this.generateBasicMemoryRecommendations(memoryUsage)
    };
  }

  private generateBasicCPURecommendations(cpuUsage: number): string[] {
    const recommendations: string[] = [];
    if (cpuUsage > 80) {
      recommendations.push('Consider scaling up CPU resources');
      recommendations.push('Investigate CPU-intensive processes');
    } else if (cpuUsage > 60) {
      recommendations.push('Monitor CPU usage trends');
      recommendations.push('Optimize background tasks');
    }
    return recommendations;
  }

  private generateBasicMemoryRecommendations(memoryUsage: number): string[] {
    const recommendations: string[] = [];
    if (memoryUsage > 85) {
      recommendations.push('Increase available memory');
      recommendations.push('Check for memory leaks');
    } else if (memoryUsage > 70) {
      recommendations.push('Monitor memory usage patterns');
      recommendations.push('Optimize memory-intensive operations');
    }
    return recommendations;
  }

  private generateBasicRecommendations(metrics: SystemMetrics): string[] {
    const recommendations: string[] = [];
    if (metrics.cpuUsage > 70 || metrics.memoryUsage > 70) {
      recommendations.push('Consider resource scaling');
    }
    if (metrics.errorCount > 0) {
      recommendations.push('Investigate and address system errors');
    }
    return recommendations;
  }

  private async analyzeCPUUsage(cpuUsage: number) {
    if (!this.llmClients.gemini) {
      return this.analyzeCPUUsageBasic(cpuUsage);
    }
    const status = cpuUsage > 80 ? 'critical' : cpuUsage > 60 ? 'warning' : 'normal';
    return {
      status,
      trend: this.calculateTrend([cpuUsage]),
      recommendations: await this.getCPURecommendations([{
        timestamp: new Date().toISOString(),
        method: 'GET',
        path: '/metrics/cpu',
        statusCode: 200,
        responseTime: 0,
        location: { country: 'Unknown', city: 'Unknown' },
        duration: cpuUsage
      }])
    };
  }

  private async analyzeMemoryUsage(memoryUsage: number) {
    if (!this.llmClients.gemini) {
      return this.analyzeMemoryUsageBasic(memoryUsage);
    }
    const status = memoryUsage > 85 ? 'critical' : memoryUsage > 70 ? 'warning' : 'normal';
    return {
      status,
      trend: this.calculateTrend([memoryUsage]),
      recommendations: await this.getMemoryRecommendations([{
        timestamp: new Date().toISOString(),
        method: 'GET',
        path: '/metrics/memory',
        statusCode: 200,
        responseTime: 0,
        location: { country: 'Unknown', city: 'Unknown' },
        duration: memoryUsage
      }])
    };
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const cpuUsage = await this.getCPUUsage();
    const memoryUsage = await this.getMemoryUsage();
    const diskUsage = await this.getDiskUsage();

    const cpuStatus = this.getResourceStatus(cpuUsage);
    const memoryStatus = this.getResourceStatus(memoryUsage);
    const diskStatus = this.getResourceStatus(diskUsage);

    return {
      cpuUsage,
      memoryUsage,
      diskUsage,
      errorCount: 0, // This should be implemented to track actual errors
      totalRequests: 0, // This should be implemented to track actual requests
      activeUsers: 0, // This should be implemented to track actual active users
      cpu: {
        usage: cpuUsage,
        status: cpuStatus,
        trend: this.calculateTrend([cpuUsage]),
        recommendations: await this.getResourceMetrics('cpu', cpuUsage)
      },
      memory: {
        usage: memoryUsage,
        status: memoryStatus,
        trend: this.calculateTrend([memoryUsage]),
        recommendations: await this.getResourceMetrics('memory', memoryUsage)
      },
      disk: {
        usage: diskUsage,
        status: diskStatus
      }
    };
  }

  private async getResourceMetrics(type: 'cpu' | 'memory', usage: number): Promise<string[]> {
    const metric: RequestMetric = {
      timestamp: new Date().toISOString(),
      method: 'GET',
      path: `/metrics/${type}`,
      statusCode: 200,
      responseTime: 0,
      location: {
        country: 'Unknown',
        city: 'Unknown'
      },
      duration: usage
    };

    return type === 'cpu' 
      ? this.getCPURecommendations([metric])
      : this.getMemoryRecommendations([metric]);
  }

  private getResourceStatus(usage: number): ResourceStatus {
    if (usage > 80) return 'critical';
    if (usage > 60) return 'warning';
    return 'normal';
  }

  private async getCPUUsage(): Promise<number> {
    // This would be implemented to get actual CPU usage
    // For now, return a mock value
    return Math.floor(Math.random() * 100);
  }

  private async getMemoryUsage(): Promise<number> {
    // This would be implemented to get actual memory usage
    // For now, return a mock value
    return Math.floor(Math.random() * 100);
  }

  private async getDiskUsage(): Promise<number> {
    // This would be implemented to get actual disk usage
    // For now, return a mock value
    return Math.floor(Math.random() * 100);
  }

  private async getRecommendations(params: any): Promise<string[]> {
    try {
      const { type, metrics } = params;
      switch (type) {
        case 'cpu':
          return this.getCPURecommendations(metrics);
        case 'memory':
          return this.getMemoryRecommendations(metrics);
        default:
          return this.generateBasicRecommendations(metrics);
      }
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      return ['No recommendations available'];
    }
  }

  private async getCPURecommendations(metrics: RequestMetric[]): Promise<string[]> {
    try {
      const prompt = `Given these request metrics: ${JSON.stringify(metrics)},
        suggest CPU optimizations.
        Include:
        - Resource usage patterns
        - Bottlenecks
        - Scaling recommendations
        Return recommendations as a JSON array of strings.`;

      const content = await this.generateContent(prompt);
      return JSON.parse(content);
    } catch (error) {
      logger.error('Error generating CPU recommendations:', error);
      return this.generateBasicCPURecommendations(metrics[0].duration);
    }
  }

  private async getMemoryRecommendations(metrics: RequestMetric[]): Promise<string[]> {
    try {
      const prompt = `Given these request metrics: ${JSON.stringify(metrics)},
        suggest memory optimizations.
        Include:
        - Resource usage patterns
        - Memory leaks
        - Scaling recommendations
        Return recommendations as a JSON array of strings.`;

      const content = await this.generateContent(prompt);
      return JSON.parse(content);
    } catch (error) {
      logger.error('Error generating memory recommendations:', error);
      return this.generateBasicMemoryRecommendations(metrics[0].duration);
    }
  }

  private async generatePerformanceRecommendations(metrics: SystemMetrics): Promise<string[]> {
    try {
      const prompt = `Given these system metrics:
        CPU Usage: ${metrics.cpuUsage}%
        Memory Usage: ${metrics.memoryUsage}%
        Error Count: ${metrics.errorCount}
        Total Requests: ${metrics.totalRequests}
        Active Users: ${metrics.activeUsers}

        Generate performance recommendations.
        Include:
        - Resource optimization
        - Scaling suggestions
        - Error handling
        Return recommendations as a JSON array of strings.`;

      const content = await this.generateContent(prompt);
      return JSON.parse(content);
    } catch (error) {
      logger.error('Error generating performance recommendations:', error);
      return this.generateBasicRecommendations(metrics);
    }
  }

  private calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable';
    const diff = values[values.length - 1] - values[0];
    return diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable';
  }

  private async generateContent(input: string): Promise<string> {
    if (!this.llmClients.gemini) {
      throw new Error('Gemini client not initialized');
    }
    const result = await this.llmClients.gemini.generateContent([{ text: input }]);
    return result.response.text();
  }

  private analyzeRequestTrends(metrics: SystemMetrics) {
    return {
      trend: this.calculateTrend([metrics.totalRequests]),
      recommendations: []
    };
  }

  private analyzeErrorTrends(metrics: SystemMetrics) {
    return {
      trend: this.calculateTrend([metrics.errorCount]),
      recommendations: []
    };
  }

  private analyzeUsageTrends(metrics: SystemMetrics) {
    return {
      trend: this.calculateTrend([metrics.activeUsers]),
      recommendations: []
    };
  }
} 