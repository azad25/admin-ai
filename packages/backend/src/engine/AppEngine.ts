import { AppDataSource } from '../database';
import { WebSocketService } from '../services/websocket.service';
import { AIService } from '../services/ai.service';
import { SystemMetricsService } from '../services/systemMetrics.service';
import { CacheService } from '../services/cache.service';
import { AIStorageService } from '../services/ai-storage.service';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';
import { HealthCheck } from './HealthCheck';
import { ErrorMonitor } from './ErrorMonitor';

interface ServiceHealth {
  isHealthy: boolean;
  lastCheck: Date;
  details?: any;
}

export class AppEngine extends EventEmitter {
  private static instance: AppEngine;
  private healthCheck: HealthCheck;
  private errorMonitor: ErrorMonitor;
  private services: Map<string, any> = new Map();
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private isInitialized: boolean = false;

  private constructor() {
    super();
    this.healthCheck = new HealthCheck();
    this.errorMonitor = new ErrorMonitor();
  }

  public static getInstance(): AppEngine {
    if (!AppEngine.instance) {
      AppEngine.instance = new AppEngine();
    }
    return AppEngine.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('AppEngine is already initialized');
      return;
    }

    try {
      logger.info('Initializing AppEngine...');

      // Initialize database
      await this.initializeDatabase();

      // Initialize cache service
      await this.initializeCache();

      // Initialize AI storage
      await this.initializeAIStorage();

      // Initialize core services
      await this.initializeServices();

      // Start health checks
      await this.startHealthChecks();

      // Start error monitoring
      await this.startErrorMonitoring();

      this.isInitialized = true;
      logger.info('AppEngine initialization completed successfully');
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize AppEngine', { error });
      this.emit('initialization_failed', error);
      throw error;
    }
  }

  private async initializeDatabase(): Promise<void> {
    try {
      logger.info('Checking database connection...');
      // Just verify the connection instead of initializing
      await AppDataSource.query('SELECT 1');
      this.services.set('database', AppDataSource);
      this.updateServiceHealth('database', true);
      logger.info('Database connection verified successfully');
    } catch (error) {
      this.updateServiceHealth('database', false, error);
      logger.error('Database connection check failed', { error });
      throw error;
    }
  }

  private async initializeCache(): Promise<void> {
    try {
      logger.info('Initializing cache service...');
      const cacheService = CacheService.getInstance();
      this.services.set('cache', cacheService);
      this.updateServiceHealth('cache', true);
      logger.info('Cache service initialized successfully');
    } catch (error) {
      this.updateServiceHealth('cache', false, error);
      logger.error('Cache service initialization failed', { error });
      throw error;
    }
  }

  private async initializeAIStorage(): Promise<void> {
    try {
      logger.info('Initializing AI storage...');
      const aiStorage = AIStorageService.getInstance();
      await aiStorage.initialize();
      this.services.set('ai-storage', aiStorage);
      this.updateServiceHealth('ai-storage', true);
      logger.info('AI storage initialized successfully');
    } catch (error) {
      this.updateServiceHealth('ai-storage', false, error);
      logger.error('AI storage initialization failed', { error });
      throw error;
    }
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize WebSocket service
      const wsService = new WebSocketService();
      this.services.set('websocket', wsService);
      this.updateServiceHealth('websocket', true);

      // Initialize AI service
      const aiService = new AIService();
      this.services.set('ai', aiService);
      this.updateServiceHealth('ai', true);

      // Initialize System Metrics service
      const metricsService = new SystemMetricsService();
      this.services.set('metrics', metricsService);
      this.updateServiceHealth('metrics', true);

      logger.info('Core services initialized successfully');
    } catch (error) {
      logger.error('Service initialization failed', { error });
      throw error;
    }
  }

  private async startHealthChecks(): Promise<void> {
    try {
      await this.healthCheck.start(this.services);
      this.healthCheck.on('service_unhealthy', (service: string) => {
        this.updateServiceHealth(service, false);
        logger.error(`Service ${service} is unhealthy`);
        this.emit('service_unhealthy', service);
      });

      this.healthCheck.on('service_healthy', (service: string) => {
        this.updateServiceHealth(service, true);
        logger.info(`Service ${service} is healthy`);
        this.emit('service_healthy', service);
      });
    } catch (error) {
      logger.error('Failed to start health checks', { error });
      throw error;
    }
  }

  private async startErrorMonitoring(): Promise<void> {
    try {
      await this.errorMonitor.start();
      this.errorMonitor.on('error_detected', (error: any) => {
        logger.error('System error detected', { error });
        this.emit('system_error', error);
      });

      this.errorMonitor.on('critical_error', (error: any) => {
        logger.error('Critical error detected', { error });
        this.emit('critical_error', error);
      });
    } catch (error) {
      logger.error('Failed to start error monitoring', { error });
      throw error;
    }
  }

  private updateServiceHealth(service: string, isHealthy: boolean, details?: any): void {
    this.serviceHealth.set(service, {
      isHealthy,
      lastCheck: new Date(),
      details
    });
  }

  public getService(serviceName: string): any {
    return this.services.get(serviceName);
  }

  public getActiveServices(): Map<string, ServiceHealth> {
    return new Map(
      Array.from(this.services.entries())
        .filter(([name]) => this.serviceHealth.get(name)?.isHealthy)
        .map(([name]) => [name, this.serviceHealth.get(name)!])
    );
  }

  public getSystemHealth(): any {
    return {
      isHealthy: Array.from(this.serviceHealth.values()).every(health => health.isHealthy),
      services: Object.fromEntries(this.serviceHealth),
      lastUpdate: new Date(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
  }

  public async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down AppEngine...');
      
      // Stop health checks
      await this.healthCheck.stop();
      
      // Stop error monitoring
      await this.errorMonitor.stop();
      
      // Shutdown all services in reverse order
      for (const [name, service] of Array.from(this.services).reverse()) {
        if (service && typeof service.shutdown === 'function') {
          logger.info(`Shutting down ${name} service...`);
          await service.shutdown();
          this.updateServiceHealth(name, false, { reason: 'shutdown' });
        }
      }

      this.isInitialized = false;
      logger.info('AppEngine shutdown completed');
      this.emit('shutdown_complete');
    } catch (error) {
      logger.error('Error during shutdown', { error });
      throw error;
    }
  }
} 