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
  LLMProvider
} from '@admin-ai/shared/src/types/ai';
import { randomUUID } from 'crypto';
import { WebSocketService, getWebSocketService } from './websocket.service';
import { AISettingsService } from './aiSettings.service';
import { AppError } from '../utils/error';
import { EventEmitter } from 'events';
import { SystemMetrics } from '../database/entities/SystemMetrics';
import { RequestMetric } from '../types/metrics';

const aiSettingsRepository = AppDataSource.getRepository('AISettings');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// Configure safety settings
const safetySettings = [
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

// Initialize the model
const model = genAI.getGenerativeModel({
  model: 'gemini-pro',
  safetySettings,
});

interface AIMessageMetadata {
  type: 'chat' | 'notification' | 'system' | 'command';
  timestamp: string;
  provider?: string;
  model?: string;
  read: boolean;
  category?: string;
  source?: {
    page: string;
    controller: string;
    action: string;
    details?: Record<string, any>;
  };
  status?: string;
  error?: string;
}

interface FunctionCall {
  function: {
    name: string;
    arguments: string;
  };
}

interface AIRequest {
  type: string;
  input: any;
  metadata?: Record<string, any>;
}

interface AIResponse {
  type: string;
  output: any;
  metadata?: Record<string, any>;
}

interface AIAction {
  action: string;
  params: any;
  result: any;
}

interface PathStats {
  total: number;
  errors: number;
}

interface EndpointStats {
  duration: number;
  count: number;
}

export class AIService extends EventEmitter {
  private wsService: WebSocketService | null = null;
  private aiSettingsService: AISettingsService;
  private openai?: OpenAI;
  private gemini?: GoogleGenerativeAI;
  private anthropic?: Anthropic;
  private isReady: boolean = false;

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

  private llmClients: Record<LLMProvider, OpenAI | GoogleGenerativeAI | Anthropic | undefined> = {
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

  private async getActiveProvider(userId: string) {
    const providers = await this.aiSettingsService.getAllProviderSettings(userId);
    return providers.find(p => p.isActive);
  }

  private async sendNotification(userId: string, content: string, status: 'success' | 'error' | 'info' | 'warning', provider?: LLMProvider, model?: string) {
    const message: AIMessage = {
      id: randomUUID(),
      content,
      role: 'system',
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
    switch (provider) {
      case 'openai':
        this.llmClients.openai = new OpenAI({ apiKey });
        break;
      case 'gemini':
        this.llmClients.gemini = new GoogleGenerativeAI(apiKey);
        break;
      case 'anthropic':
        this.llmClients.anthropic = new Anthropic({ apiKey });
        break;
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
          availableModels = ['gemini-pro'];
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
      metadata: {
        type: 'chat',
        model: typeof model === 'string' ? model : undefined,
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

      const client = this.llmClients[provider as keyof typeof this.llmClients];

      if (!client) {
        throw new Error(`No client initialized for provider ${provider}`);
      }

      let response: AIMessage;

      switch (provider) {
        case 'openai': {
          const openai = client as OpenAI;
          const completion = await openai.chat.completions.create({
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
          const genAI = client as GoogleGenerativeAI;
          const model = genAI.getGenerativeModel({ model: selectedModel });
          const result = await model.generateContent(message.content);
          const text = result.response.text();

          response = {
            id: randomUUID(),
            role: 'assistant',
            content: text,
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

        case 'anthropic': {
          const anthropic = client as Anthropic;
          const result = await anthropic.messages.create({
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
      metadata: {
        type: 'command',
        command,
        status: 'info',
        timestamp: new Date().toISOString()
      }
    };

    return message;
  }

  async getSystemStatus(): Promise<AISystemStatus> {
    const providers = await this.aiSettingsService.getAllProviderSettings();
    const activeProviders = providers
      .filter(p => p.isActive && p.isVerified)
      .map(p => ({
        provider: p.provider,
        model: p.selectedModel || 'default'
      }));

    return {
      ready: this.isReady,
      connected: this.wsService?.getConnectionStatus() || false,
      initialized: true,
      hasProviders: activeProviders.length > 0,
      activeProviders
    };
  }

  getSettings(): AISettings {
    return this.settings;
  }

  updateSettings(settings: Partial<AISettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  async generateSchema(description: string): Promise<Record<string, unknown>> {
    try {
      const prompt = `Generate a JSON schema for a database table based on this description: "${description}". 
        Include appropriate field types, validations, and relationships. 
        Return only the JSON schema object without any explanation.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the response as JSON
      return JSON.parse(text);
    } catch (error) {
      logger.error('Error generating schema:', error);
      throw new Error('Failed to generate schema');
    }
  }

  async generateCrudConfig(
    schema: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      const prompt = `Given this database schema: ${JSON.stringify(schema)},
        generate a CRUD page configuration including:
        - Table columns with appropriate formatting
        - Form fields with validations
        - Default sorting
        - Searchable fields
        Return only the JSON configuration object without any explanation.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the response as JSON
      return JSON.parse(text);
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

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the response as JSON
      return JSON.parse(text);
    } catch (error) {
      logger.error('Error analyzing data:', error);
      throw new Error('Failed to analyze data');
    }
  }

  async generateDashboardSuggestions(
    data: unknown[]
  ): Promise<Record<string, unknown>> {
    try {
      const prompt = `Given this dataset: ${JSON.stringify(data)},
        suggest dashboard widgets that would be useful for visualization.
        Include:
        - Widget types (chart, table, metric, etc.)
        - Configurations
        - Layouts
        Return only the JSON configuration object without any explanation.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the response as JSON
      return JSON.parse(text);
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
      logger.info('Initializing AI service...');
      await this.setupAIComponents();
      this.isReady = true;
      
      // Broadcast initial status
      if (this.wsService) {
        const status = await this.getSystemStatus();
        this.wsService.broadcast('ai:status', status);
        this.wsService.broadcast('ai:ready', { ready: true });
      }

      logger.info('AI service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AI service:', error);
      throw error;
    }
  }

  private async setupAIComponents(): Promise<void> {
    try {
      // Wait for settings service to be ready
      await this.aiSettingsService.waitForReady();
      
      // Get active provider settings
      const providers = await this.aiSettingsService.getAllProviderSettings();
      
      // Initialize each provider client
      for (const provider of providers) {
        if (provider.isActive && provider.isVerified) {
          await this.initializeClient(provider.provider, provider.apiKey);
        }
      }

      logger.info('AI components setup completed');
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
      return {
        performance: {
          cpuAnalysis: this.analyzeCPUUsage(metrics.cpuUsage),
          memoryAnalysis: this.analyzeMemoryUsage(metrics.memoryUsage),
          recommendations: this.generatePerformanceRecommendations(metrics)
        },
        trends: {
          requests: this.analyzeRequestTrends(metrics),
          errors: this.analyzeErrorTrends(metrics),
          usage: this.analyzeUsageTrends(metrics)
        }
      };
    } catch (error) {
      logger.error('Failed to analyze metrics:', error);
      throw new AppError(500, 'Failed to analyze metrics');
    }
  }

  public async analyzeRequestMetrics(metrics: RequestMetric[]) {
    try {
      return {
        patterns: this.analyzeRequestPatterns(metrics),
        performance: this.analyzeResponseTimes(metrics),
        locations: this.analyzeGeographicDistribution(metrics),
        recommendations: this.generateRequestOptimizations(metrics)
      };
    } catch (error) {
      logger.error('Failed to analyze request metrics:', error);
      throw new AppError(500, 'Failed to analyze request metrics');
    }
  }

  public async getMetrics() {
    try {
      return {
        requestCount: await this.getRequestCount(),
        averageLatency: await this.getAverageLatency(),
        errorRate: await this.getErrorRate(),
        modelUsage: await this.getModelUsage()
      };
    } catch (error) {
      logger.error('Failed to get AI metrics:', error);
      throw new AppError(500, 'Failed to get AI metrics');
    }
  }

  private analyzeCPUUsage(cpuUsage: number) {
    const status = cpuUsage > 80 ? 'critical' : cpuUsage > 60 ? 'warning' : 'normal';
    return {
      status,
      trend: this.calculateTrend([cpuUsage]),
      recommendations: this.getCPURecommendations(cpuUsage)
    };
  }

  private analyzeMemoryUsage(memoryUsage: number) {
    const status = memoryUsage > 85 ? 'critical' : memoryUsage > 70 ? 'warning' : 'normal';
    return {
      status,
      trend: this.calculateTrend([memoryUsage]),
      recommendations: this.getMemoryRecommendations(memoryUsage)
    };
  }

  private analyzeRequestPatterns(metrics: RequestMetric[]) {
    return {
      commonPaths: this.getCommonPaths(metrics),
      peakTimes: this.getPeakTimes(metrics),
      errorProne: this.getErrorProneEndpoints(metrics)
    };
  }

  private analyzeResponseTimes(metrics: RequestMetric[]) {
    const times = metrics.map(m => m.duration);
    return {
      average: this.calculateAverage(times),
      percentiles: this.calculatePercentiles(times),
      slowest: this.getSlowestEndpoints(metrics)
    };
  }

  private analyzeGeographicDistribution(metrics: RequestMetric[]) {
    return metrics
      .filter(m => m.location)
      .reduce((acc, m) => {
        const key = `${m.location!.country}:${m.location!.city}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
  }

  private async getRequestCount(): Promise<number> {
    // Implementation would depend on your metrics storage
    return 0;
  }

  private async getAverageLatency(): Promise<number> {
    // Implementation would depend on your metrics storage
    return 0;
  }

  private async getErrorRate(): Promise<number> {
    // Implementation would depend on your metrics storage
    return 0;
  }

  private async getModelUsage(): Promise<Record<string, number>> {
    // Implementation would depend on your metrics storage
    return {};
  }

  private calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable';
    const diff = values[values.length - 1] - values[0];
    return diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable';
  }

  private calculateAverage(values: number[]): number {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  private calculatePercentiles(values: number[]): Record<string, number> {
    if (!values.length) return { p50: 0, p90: 0, p95: 0, p99: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  private getCommonPaths(metrics: RequestMetric[]): Array<{ path: string; count: number }> {
    const counts = metrics.reduce((acc, m) => {
      acc[m.path] = (acc[m.path] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts)
      .map(([path, count]) => ({ path, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getPeakTimes(metrics: RequestMetric[]): Array<{ hour: number; count: number }> {
    const hourCounts = metrics.reduce((acc, m) => {
      const hour = new Date(m.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count: count as number }))
      .sort((a, b) => b.count - a.count);
  }

  private getErrorProneEndpoints(metrics: RequestMetric[]): Array<{ path: string; errorRate: number }> {
    const pathStats = metrics.reduce((acc, m) => {
      if (!acc[m.path]) acc[m.path] = { total: 0, errors: 0 };
      acc[m.path].total++;
      if (m.statusCode >= 400) acc[m.path].errors++;
      return acc;
    }, {} as Record<string, PathStats>);

    return Object.entries(pathStats)
      .map(([path, stats]) => ({
        path,
        errorRate: (stats.errors / stats.total) * 100
      }))
      .filter(({ errorRate }) => errorRate > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5);
  }

  private getSlowestEndpoints(metrics: RequestMetric[]): Array<{ path: string; avgDuration: number }> {
    const pathStats = metrics.reduce((acc, m) => {
      if (!acc[m.path]) acc[m.path] = { duration: 0, count: 0 };
      acc[m.path].duration += m.duration;
      acc[m.path].count++;
      return acc;
    }, {} as Record<string, EndpointStats>);

    return Object.entries(pathStats)
      .map(([path, stats]) => ({
        path,
        avgDuration: stats.duration / stats.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);
  }

  private getCPURecommendations(cpuUsage: number): string[] {
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

  private getMemoryRecommendations(memoryUsage: number): string[] {
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

  private generatePerformanceRecommendations(metrics: SystemMetrics): string[] {
    const recommendations: string[] = [];
    if (metrics.cpuUsage > 70 || metrics.memoryUsage > 70) {
      recommendations.push('Consider resource scaling');
    }
    if (metrics.errorCount > 0) {
      recommendations.push('Investigate and address system errors');
    }
    return recommendations;
  }

  private generateRequestOptimizations(metrics: RequestMetric[]): string[] {
    const recommendations: string[] = [];
    const slowEndpoints = this.getSlowestEndpoints(metrics);
    const errorEndpoints = this.getErrorProneEndpoints(metrics);

    if (slowEndpoints.length > 0) {
      recommendations.push(`Optimize slow endpoints: ${slowEndpoints[0].path}`);
    }
    if (errorEndpoints.length > 0) {
      recommendations.push(`Fix error-prone endpoints: ${errorEndpoints[0].path}`);
    }

    return recommendations;
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