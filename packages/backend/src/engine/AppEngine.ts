import { AppDataSource } from '../database';
import { WebSocketService } from '../services/websocket.service';
import { AIService } from '../services/ai.service';
import { AISettingsService } from '../services/aiSettings.service';
import { SystemMetricsService } from '../services/systemMetrics.service';
import { CacheService } from '../services/cache.service';
import { AIStorageService } from '../services/ai-storage.service';
import { logger, initializeLogging } from '../utils/logger';
import { EventEmitter } from 'events';
import { HealthCheck } from './HealthCheck';
import { ErrorMonitor } from './ErrorMonitor';
import { Server as HTTPServer, createServer } from 'http';
import { MonitoringService } from '../services/monitoring.service';
import { kafkaService } from '../services/kafka.service';
import { createApp } from '../app';
import express, { Express, Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import cors from 'cors';
import helmet from 'helmet';

interface ServiceStatus {
  isConnected: boolean;
  lastChecked: Date;
  error?: string;
}

interface Service {
  shutdown?: () => Promise<void>;
  [key: string]: any;
}

interface ServiceHealth {
  isHealthy: boolean;
  lastChecked: Date;
  details?: unknown;
}

export class AppEngine extends EventEmitter {
  private static instance: AppEngine | null = null;
  private static isInitializing: boolean = false;
  private healthChecker: HealthCheck;
  private errorMonitor: ErrorMonitor;
  private services: Map<string, Service> = new Map();
  private serviceStatus: Map<string, ServiceStatus> = new Map();
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private server: HTTPServer | null = null;
  private app: Express | null = null;

  // Service instances
  private webSocketService: WebSocketService | null = null;
  private aiService: AIService | null = null;
  private aiSettingsService: AISettingsService | null = null;
  private systemMetricsService: SystemMetricsService | null = null;
  private cacheService: CacheService | null = null;
  private aiStorageService: AIStorageService | null = null;
  private monitoringService: MonitoringService | null = null;

  private constructor() {
    super();
    this.healthChecker = new HealthCheck();
    this.errorMonitor = new ErrorMonitor();

    // Initialize service status map with default values
    const services = ['websocket', 'aiSettings', 'ai', 'monitoring', 'systemMetrics', 'database', 'logging', 'server'];
    services.forEach(service => {
      this.serviceStatus.set(service, {
        isConnected: false,
        lastChecked: new Date(),
      });
    });
  }

  public static async getInstance(): Promise<AppEngine> {
    if (!AppEngine.instance && !AppEngine.isInitializing) {
      AppEngine.isInitializing = true;
      try {
        AppEngine.instance = new AppEngine();
      } catch (error) {
        AppEngine.isInitializing = false;
        throw error;
      }
      AppEngine.isInitializing = false;
    }
    return AppEngine.instance!;
  }

  private async initializeLogging(): Promise<void> {
    try {
      await initializeLogging();
      this.updateServiceStatus('logging', true);
      logger.info('Logging system initialized');
    } catch (error) {
      this.updateServiceStatus('logging', false, error instanceof Error ? error.message : 'Unknown error');
      logger.error('Failed to initialize logging:', error);
      throw error;
    }
  }

  private async createServer(): Promise<void> {
    try {
      // Create Express app first
      const app = express();
      this.app = app;
      
      // Add basic middleware
      app.use(cors());
      app.use(helmet({
        contentSecurityPolicy: false
      }));
      app.use(express.json());
      
      // Add a basic request handler to respond to requests before the full app is configured
      app.use((req: Request, res: Response, next: NextFunction) => {
        if (!this.isInitialized) {
          res.status(503).json({ error: 'Server is starting up, please try again in a moment' });
        } else {
          next();
        }
      });
      
      // Create HTTP server with the Express app attached
      this.server = createServer(app);
      
      this.updateServiceStatus('server', true);
      logger.info('HTTP server created successfully');
    } catch (error) {
      this.updateServiceStatus('server', false, error instanceof Error ? error.message : 'Unknown error');
      logger.error('Failed to create HTTP server:', error);
      throw error;
    }
  }

  public async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.isInitialized) {
      logger.warn('AppEngine is already initialized');
      return;
    }

    this.initializationPromise = (async () => {
      try {
        // Initialize logging first
        await this.initializeLogging();

        // Create HTTP server
        await this.createServer();

        // Initialize core infrastructure
        await this.initializeDatabase();
        await this.initializeCache();
        await this.initializeAIStorage();
        await this.initializeKafka();

        // Initialize WebSocket service first
        await this.initializeWebSocket();
        
        // Then configure Express app
        await this.configureApp();
        
        // Then initialize other services
        await this.initializeAISettings();
        await this.initializeMonitoring();
        await this.initializeAI();
        await this.initializeSystemMetrics();

        // Start monitoring
        await this.startHealthChecks();
        await this.startErrorMonitoring();

        this.isInitialized = true;
        logger.info('AppEngine initialization completed successfully');
      } catch (error) {
        logger.error('Failed to initialize AppEngine:', error);
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  private async initializeDatabase(): Promise<void> {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      await AppDataSource.query('SELECT 1');
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async initializeCache(): Promise<void> {
    try {
      this.cacheService = CacheService.getInstance();
      if (!this.cacheService) throw new Error('Failed to get CacheService instance');
      // Wait for Redis to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Cache service initialization timeout'));
        }, 5000);

        const checkReady = () => {
          if (this.cacheService?.isReady()) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });
      this.services.set('cache', this.cacheService);
      logger.info('Cache service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize cache service:', error);
      throw error;
    }
  }

  private async initializeAIStorage(): Promise<void> {
    try {
      this.aiStorageService = AIStorageService.getInstance();
      if (!this.aiStorageService) throw new Error('Failed to get AIStorageService instance');
      await this.aiStorageService.initialize();
      this.services.set('aiStorage', this.aiStorageService);
      logger.info('AI Storage initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AI storage:', error);
      throw error;
    }
  }

  private async initializeKafka(): Promise<void> {
    try {
      await kafkaService.connect();
      logger.info('Kafka initialized successfully');
    } catch (error) {
      logger.warn('Failed to initialize Kafka, continuing without it:', error);
    }
  }

  private async initializeWebSocket(): Promise<void> {
    try {
      if (!this.server) {
        throw new Error('Server must be set before initializing WebSocket service');
      }

      const wsService = await WebSocketService.getInstance();
      await wsService.initialize(this.server);
      this.webSocketService = wsService;
      this.updateServiceStatus('websocket', true);
      logger.info('WebSocket service initialized');
    } catch (error) {
      this.updateServiceStatus('websocket', false, error instanceof Error ? error.message : 'Unknown error');
      logger.error('Failed to initialize WebSocket service:', error);
      throw error;
    }
  }

  private async initializeAISettings(): Promise<void> {
    try {
      this.aiSettingsService = await AISettingsService.getInstance();
      // Set the WebSocket service before initializing
      if (this.webSocketService) {
        this.aiSettingsService.setWebSocketService(this.webSocketService);
      } else {
        logger.warn('WebSocketService not available when initializing AISettingsService');
      }
      await this.aiSettingsService.initialize();
      this.services.set('aiSettings', this.aiSettingsService);
      this.updateServiceStatus('aiSettings', true);
      logger.info('AI Settings service initialized');
    } catch (error) {
      this.updateServiceStatus('aiSettings', false, error instanceof Error ? error.message : 'Unknown error');
      logger.error('Failed to initialize AI Settings service:', error);
      throw error;
    }
  }

  private async initializeMonitoring(): Promise<void> {
    try {
      this.monitoringService = await MonitoringService.getInstance();
      await this.monitoringService.initialize();
      this.services.set('monitoring', this.monitoringService);

      // Connect with other services
      if (this.webSocketService) {
        this.monitoringService.setWebSocketService(this.webSocketService);
      }
      if (this.aiService) {
        this.monitoringService.setAIService(this.aiService);
      }

      logger.info('Monitoring service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Monitoring service:', error);
      throw error;
    }
  }

  private async initializeAI(): Promise<void> {
    if (this.aiService) {
      logger.info('AI service is already initialized');
      return;
    }

    try {
      logger.info('Starting AI service initialization...');
      
      // Create AI service instance
      this.aiService = new AIService();
      
      // Set required services
      if (!this.webSocketService) {
        throw new Error('WebSocket service must be initialized before AI service');
      }
      
      if (!this.aiSettingsService) {
        throw new Error('AI Settings service must be initialized before AI service');
      }

      // Set dependencies
      this.aiService.setWebSocketService(this.webSocketService);
      this.aiService.setAISettingsService(this.aiSettingsService);
      
      // Initialize base functionality
      await this.aiService.initializeBase();
      
      this.services.set('ai', this.aiService);
      this.updateServiceStatus('ai', true);
      logger.info('AI service initialized successfully');
    } catch (error) {
      this.updateServiceStatus('ai', false, error instanceof Error ? error.message : 'Unknown error');
      logger.error('Failed to initialize AI service:', error);
      throw error;
    }
  }

  private async initializeSystemMetrics(): Promise<void> {
    try {
      if (!this.webSocketService || !this.aiService) {
        throw new Error('WebSocket and AI services must be initialized before System Metrics service');
      }
      this.systemMetricsService = SystemMetricsService.getInstance();
      if (!this.systemMetricsService) throw new Error('Failed to get SystemMetricsService instance');
      
      // Initialize services using the correct method
      await this.systemMetricsService.initializeServices(this.webSocketService, this.aiService);
      this.services.set('systemMetrics', this.systemMetricsService);
      logger.info('System Metrics service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize System Metrics service:', error);
      throw error;
    }
  }

  private async configureApp(): Promise<void> {
    try {
      if (!this.server) throw new Error('Server not initialized');
      
      // Check if WebSocket service is initialized, if not, initialize it
      if (!this.webSocketService) {
        logger.warn('WebSocket service not initialized before configuring app, initializing now');
        await this.initializeWebSocket();
      }
      
      if (!this.webSocketService) {
        throw new Error('Failed to initialize WebSocket service');
      }
      
      // Create the Express app
      const configuredApp = await createApp(this.webSocketService);
      
      // Replace the existing app with the configured one
      if (this.app) {
        // Remove all existing routes and middleware
        this.app._router = null;
      }
      
      this.app = configuredApp;
      
      // Attach the configured app to the server
      this.server.removeAllListeners('request');
      this.server.on('request', this.app);
      
      logger.info('Express app configured successfully');
    } catch (error) {
      logger.error('Failed to configure Express app:', error);
      throw error;
    }
  }

  // Service getters
  public getWebSocketService(): WebSocketService {
    if (!this.webSocketService) throw new Error('WebSocket service not initialized');
    return this.webSocketService;
  }

  public getAIService(): AIService {
    if (!this.aiService) throw new Error('AI service not initialized');
    return this.aiService;
  }

  public getAISettingsService(): AISettingsService {
    if (!this.aiSettingsService) throw new Error('AI Settings service not initialized');
    return this.aiSettingsService;
  }

  public getSystemMetricsService(): SystemMetricsService {
    if (!this.systemMetricsService) throw new Error('System Metrics service not initialized');
    return this.systemMetricsService;
  }

  public getCacheService(): CacheService {
    if (!this.cacheService) throw new Error('Cache service not initialized');
    return this.cacheService;
  }

  public getAIStorageService(): AIStorageService {
    if (!this.aiStorageService) throw new Error('AI Storage service not initialized');
    return this.aiStorageService;
  }

  public getMonitoringService(): MonitoringService {
    if (!this.monitoringService) throw new Error('Monitoring service not initialized');
    return this.monitoringService;
  }

  public getApp(): Express {
    if (!this.app) throw new Error('Express app not configured');
    return this.app;
  }

  private async startHealthChecks(): Promise<void> {
    try {
      await this.healthChecker.start(this.services);
      this.healthChecker.on('service_unhealthy', (service: string) => {
        this.updateServiceHealth(service, false);
        logger.error(`Service ${service} is unhealthy`);
        this.emit('service_unhealthy', service);
      });

      this.healthChecker.on('service_healthy', (service: string) => {
        this.updateServiceHealth(service, true);
        logger.info(`Service ${service} is healthy`);
        this.emit('service_healthy', service);
      });
    } catch (error) {
      logger.error('Failed to start health checks:', error);
      throw error;
    }
  }

  private async startErrorMonitoring(): Promise<void> {
    try {
      await this.errorMonitor.start();
      this.errorMonitor.on('error_detected', (error: unknown) => {
        logger.error('System error detected:', error);
        this.emit('system_error', error);
      });

      this.errorMonitor.on('critical_error', (error: unknown) => {
        logger.error('Critical error detected:', error);
        this.emit('critical_error', error);
      });
    } catch (error) {
      logger.error('Failed to start error monitoring:', error);
      throw error;
    }
  }

  private updateServiceHealth(service: string, isHealthy: boolean, details?: unknown): void {
    this.serviceHealth.set(service, {
      isHealthy,
      lastChecked: new Date(),
      details
    });
  }

  public getService(serviceName: string): Service | undefined {
    return this.services.get(serviceName);
  }

  public getActiveServices(): Map<string, ServiceHealth> {
    return new Map(
      Array.from(this.services.entries())
        .filter(([name]) => this.serviceHealth.get(name)?.isHealthy)
        .map(([name, service]) => [name, this.serviceHealth.get(name)!])
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

  public getConnectionStatus(): boolean {
    return this.webSocketService?.getConnectionStatus() || false;
  }

  public async shutdown(): Promise<void> {
    try {
      // Shutdown services in reverse order
      if (this.webSocketService) {
        await this.webSocketService.shutdown();
        this.updateServiceStatus('websocket', false);
      }

      // Close database connection
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        this.updateServiceStatus('database', false);
      }

      logger.info('All services shut down successfully');
    } catch (error) {
      logger.error('Error during shutdown:', error);
      throw error;
    }
  }

  private async checkServiceHealth(serviceName: string): Promise<boolean> {
    try {
      switch (serviceName) {
        case 'websocket':
          return this.webSocketService?.getConnectionStatus() || false;
        case 'database':
          return AppDataSource.isInitialized || false;
        default:
          return true;
      }
    } catch (error) {
      logger.error(`Error checking health of ${serviceName}:`, error);
      return false;
    }
  }

  public async checkHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    for (const [serviceName] of this.services) {
      health[serviceName] = await this.checkServiceHealth(serviceName);
    }
    return health;
  }

  private updateServiceStatus(service: string, isConnected: boolean, error?: string): void {
    const status = this.serviceStatus.get(service);
    if (status) {
      status.isConnected = isConnected;
      status.lastChecked = new Date();
      if (error) {
        status.error = error;
      } else {
        delete status.error;
      }
    }
  }

  public getServiceStatus(service: string): ServiceStatus | undefined {
    return this.serviceStatus.get(service);
  }

  public getAllServiceStatuses(): Map<string, ServiceStatus> {
    return new Map(this.serviceStatus);
  }

  // Add getServer method
  public getServer(): HTTPServer {
    if (!this.server) {
      throw new Error('Server not initialized');
    }
    return this.server;
  }
}