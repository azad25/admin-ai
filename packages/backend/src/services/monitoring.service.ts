import { EventEmitter } from 'events';
import { CacheService } from './cache.service';
import { SystemMetricsService } from './systemMetrics.service';
import { AIService } from './ai.service';
import { logger } from '../utils/logger';
import { AIMessage, AIAnalysis } from '@admin-ai/shared/src/types/ai';
import { SystemHealth, RequestMetric, ErrorLog } from '../types/metrics';

const CACHE_KEYS = {
  ERRORS: 'monitoring:errors',
  SYSTEM_HEALTH: 'monitoring:health',
  METRICS: 'monitoring:metrics',
  AI_EVENTS: 'monitoring:ai_events',
  WORKFLOWS: 'monitoring:workflows'
};

export class MonitoringService extends EventEmitter {
  private static instance: MonitoringService;
  private cache: CacheService;
  private metricsService: SystemMetricsService;
  private aiService: AIService | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL = 5000; // 5 seconds

  private constructor() {
    super();
    this.cache = CacheService.getInstance();
    this.metricsService = SystemMetricsService.getInstance();
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  public setAIService(aiService: AIService): void {
    this.aiService = aiService;
  }

  public async initialize(): Promise<void> {
    try {
      // Start periodic updates
      this.startUpdates();
      logger.info('Monitoring service initialized');
    } catch (error) {
      logger.error('Failed to initialize monitoring service:', error);
      throw error;
    }
  }

  private startUpdates(): void {
    this.updateInterval = setInterval(async () => {
      await this.updateMetrics();
    }, this.UPDATE_INTERVAL);
  }

  private async updateMetrics(): Promise<void> {
    try {
      const [health, metrics] = await Promise.all([
        this.metricsService.getSystemHealth(),
        this.metricsService.getSystemMetrics()
      ]);

      // Cache the latest metrics
      await Promise.all([
        this.cache.set(CACHE_KEYS.SYSTEM_HEALTH, health, 300), // 5 minutes TTL
        this.cache.set(CACHE_KEYS.METRICS, metrics, 300)
      ]);

      // Analyze system state using AI if available
      if (this.aiService) {
        const analysis = await this.aiService.analyzeMetrics(metrics);
        if (analysis) {
          await this.cache.set(`${CACHE_KEYS.AI_EVENTS}:analysis`, analysis, 600);
        }
      }

      this.emit('metrics-updated', { health, metrics });
    } catch (error) {
      logger.error('Failed to update metrics:', error);
    }
  }

  public async logError(error: ErrorLog): Promise<void> {
    try {
      const errors = await this.cache.get<ErrorLog[]>(CACHE_KEYS.ERRORS) || [];
      errors.unshift(error);
      
      // Keep only last 100 errors
      if (errors.length > 100) {
        errors.pop();
      }

      await this.cache.set(CACHE_KEYS.ERRORS, errors, 86400); // 24 hours TTL
      this.emit('error-logged', error);

      // Trigger AI analysis for critical errors
      if (error.severity === 'high') {
        const analysis = await this.aiService?.analyzeError(error);
        if (analysis) {
          await this.recordWorkflow('error-analysis', {
            error,
            analysis,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      logger.error('Failed to log error:', err);
    }
  }

  public async getRecentErrors(): Promise<ErrorLog[]> {
    return await this.cache.get<ErrorLog[]>(CACHE_KEYS.ERRORS) || [];
  }

  public async getSystemStatus(): Promise<{
    health: SystemHealth;
    metrics: any;
    recentErrors: ErrorLog[];
    aiAnalysis: any;
  }> {
    const [health, metrics, errors, analysis] = await Promise.all([
      this.cache.get<SystemHealth>(CACHE_KEYS.SYSTEM_HEALTH),
      this.cache.get(CACHE_KEYS.METRICS),
      this.getRecentErrors(),
      this.cache.get(`${CACHE_KEYS.AI_EVENTS}:analysis`)
    ]);

    return {
      health: health || await this.metricsService.getSystemHealth(),
      metrics: metrics || await this.metricsService.getSystemMetrics(),
      recentErrors: errors,
      aiAnalysis: analysis
    };
  }

  public async recordWorkflow(type: string, data: any): Promise<void> {
    const key = `${CACHE_KEYS.WORKFLOWS}:${type}`;
    const workflows = await this.cache.get<any[]>(key) || [];
    workflows.unshift({ ...data, timestamp: new Date().toISOString() });
    
    // Keep only last 50 workflows per type
    if (workflows.length > 50) {
      workflows.pop();
    }

    await this.cache.set(key, workflows, 86400); // 24 hours TTL
  }

  public async getWorkflows(type: string): Promise<any[]> {
    return await this.cache.get<any[]>(`${CACHE_KEYS.WORKFLOWS}:${type}`) || [];
  }

  public async shutdown(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    logger.info('Monitoring service shut down');
  }
} 