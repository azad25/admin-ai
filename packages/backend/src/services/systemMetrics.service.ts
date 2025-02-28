import os from 'os';
import * as fs from 'fs';
import { logger } from '../utils/logger';
import { AppDataSource } from '../database';
import { WebSocketService } from './websocket.service';
import { AIService } from './ai.service';
import { BaseLog } from '@admin-ai/shared/src/types/logs';
import { SystemMetrics } from '../database/entities/SystemMetrics';
import { ErrorLog } from '../database/entities/ErrorLog';
import { RequestLocation as DBRequestLocation } from '../database/entities/RequestLocation';
import { Repository } from 'typeorm';
import { EventEmitter } from 'events';
import { AISettingsService } from './aiSettings.service';
import { AppError } from '../middleware/errorHandler';
import { SecurityEvent } from '../database/entities/SecurityEvent';

interface AuthLog {
  timestamp: string;
  userId: string;
  action: 'login' | 'logout' | 'failed_login' | 'register';
  ip: string;
  userAgent: string;
  location?: {
    country: string;
    city: string;
    latitude: number;
    longitude: number;
  };
}

interface RequestMetric {
  timestamp: string;
  path: string;
  method: string;
  statusCode: number;
  duration: number;
  ip: string;
  location?: {
    country: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  userAgent?: string;
  referer?: string;
  query?: string;
}

interface RequestLocation {
  ip: string;
  latitude: number;
  longitude: number;
  count: number;
  lastSeen: string;
  city: string;
  country: string;
  uniqueIps: number;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  score: number;
  issues: string[];
  uptime: number;
  cpu: {
    usage: number;
    cores: number;
    model: string;
    speed: number;
  };
  memory: {
    total: number;
    free: number;
    usage: number;
  };
  database: {
    status: string;
    active_connections: number;
    size: number;
    tables: number;
  };
}

interface ErrorDetails {
  message: string;
  stack?: string;
  path?: string;
  method?: string;
  userId?: string | null;
  userAgent?: string;
  ip?: string;
  location?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  timestamp: string;
  requestBody?: any;
  requestQuery?: any;
  requestParams?: any;
  statusCode: number;
}

interface SystemMetric {
  timestamp: Date;
  type: string;
  value: number;
  metadata?: Record<string, any>;
}

interface AIActivity {
  type: string;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

interface SystemNotification {
  type: string;
  severity: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class SystemMetricsService extends EventEmitter {
  private static instance: SystemMetricsService;
  private startTime: number;
  private authLogs: AuthLog[] = [];
  private requestMetrics: RequestMetric[] = [];
  private requestLocations: Map<string, RequestLocation> = new Map();
  private locationIps: Map<string, Set<string>> = new Map();
  private maxLogsToKeep = 1000;
  private readonly cleanupInterval = 3600000; // 1 hour in milliseconds
  private wsService?: WebSocketService;
  private aiService?: AIService;
  private aiSettingsService?: AISettingsService;
  private metricsInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsRepository!: Repository<SystemMetrics>;
  private errorRepository!: Repository<ErrorLog>;
  private locationRepository!: Repository<DBRequestLocation>;
  private securityRepository!: Repository<SecurityEvent>;
  private isInitialized = false;
  private readonly METRICS_INTERVAL = 60000; // 1 minute

  private constructor() {
    super();
    this.startTime = Date.now();
  }

  public static getInstance(): SystemMetricsService {
    if (!SystemMetricsService.instance) {
      SystemMetricsService.instance = new SystemMetricsService();
    }
    return SystemMetricsService.instance;
  }

  public async initializeServices(wsService: WebSocketService, aiService?: AIService): Promise<void> {
    if (this.isInitialized) {
      logger.info('System metrics service already initialized');
      return;
    }

    try {
      await this.ensureDatabaseConnection();
      await this.initializeRepositories();
      
      this.wsService = wsService;
      this.aiService = aiService;
      this.aiSettingsService = new AISettingsService();

      await this.startMonitoring();
      
      this.isInitialized = true;
      logger.info('System metrics service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize system metrics service:', error);
      throw new AppError(500, 'Failed to initialize system metrics service');
    }
  }

  private async ensureDatabaseConnection(): Promise<void> {
    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        if (!AppDataSource.isInitialized) {
          await AppDataSource.initialize();
          logger.info('Database connection established successfully');
          return;
        }

        await AppDataSource.query('SELECT 1');
        logger.debug('Database connection verified');
        return;
      } catch (error) {
        retries++;
        logger.error(`Database connection attempt ${retries} failed:`, error);

        if (retries < maxRetries) {
          const delay = retries * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new AppError(500, 'Failed to establish database connection');
  }

  private async initializeRepositories(): Promise<void> {
    if (!AppDataSource.isInitialized) {
      throw new AppError(500, 'Database connection must be initialized before repositories');
    }
    
    try {
      this.metricsRepository = AppDataSource.getRepository(SystemMetrics);
      this.errorRepository = AppDataSource.getRepository(ErrorLog);
      this.locationRepository = AppDataSource.getRepository(DBRequestLocation);
      this.securityRepository = AppDataSource.getRepository(SecurityEvent);
      logger.info('Repositories initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize repositories:', error);
      throw new AppError(500, 'Failed to initialize repositories');
    }
  }

  private async startMonitoring(): Promise<void> {
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics().catch(error => {
        logger.error('Failed to collect system metrics:', error);
      });
    }, this.METRICS_INTERVAL);

    this.healthCheckInterval = setInterval(() => {
      this.checkSystemHealth().catch(error => {
        logger.error('Failed to check system health:', error);
      });
    }, this.METRICS_INTERVAL);
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      const metrics = await this.getSystemMetrics();
      await this.metricsRepository.save(metrics);
      this.emit('metrics-updated', metrics);
    } catch (error) {
      logger.error('Failed to collect system metrics:', error);
    }
  }

  private async checkSystemHealth(): Promise<void> {
    try {
      const health = await this.getSystemHealth();
      this.emit('health-updated', health);
    } catch (error) {
      logger.error('Failed to check system health:', error);
    }
  }

  public async getSystemHealth(): Promise<SystemHealth> {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = (totalMemory - freeMemory) / totalMemory;

    const health: SystemHealth = {
      status: 'healthy',
      score: 100,
      issues: [],
      uptime: process.uptime(),
      cpu: {
        usage: cpuUsage,
        cores: os.cpus().length,
        model: os.cpus()[0].model,
        speed: os.cpus()[0].speed
      },
      memory: {
        total: totalMemory,
        free: freeMemory,
        usage: memoryUsage
      },
      database: {
        status: 'connected',
        active_connections: 0,
        size: 0,
        tables: 0
      }
    };

    if (cpuUsage > 0.8) {
      health.status = 'warning';
      health.score -= 20;
      health.issues.push('High CPU usage');
    }

    if (memoryUsage > 0.9) {
      health.status = 'warning';
      health.score -= 20;
      health.issues.push('High memory usage');
    }

    return health;
  }

  public async getSystemMetrics(): Promise<SystemMetrics> {
    const metrics = new SystemMetrics();
    metrics.timestamp = new Date();
    metrics.cpuUsage = os.loadavg()[0] / os.cpus().length;
    metrics.memoryUsage = (os.totalmem() - os.freemem()) / os.totalmem();
    metrics.totalRequests = this.requestMetrics.length;
    metrics.errorCount = 0;
    metrics.warningCount = 0;
    
    // Calculate active users from auth logs within last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    metrics.activeUsers = this.authLogs.filter(log => 
      new Date(log.timestamp).getTime() > fifteenMinutesAgo.getTime() && log.action === 'login'
    ).length;

    // Calculate average response time from recent requests
    const recentRequests = this.requestMetrics.filter(metric => 
      new Date(metric.timestamp).getTime() > fifteenMinutesAgo.getTime()
    );
    metrics.averageResponseTime = recentRequests.length > 0
      ? recentRequests.reduce((sum, req) => sum + req.duration, 0) / recentRequests.length
      : 0;

    // Initialize empty arrays/objects for optional fields
    metrics.topPaths = [];
    metrics.locationStats = {};
    
    return metrics;
  }

  public async getRecentErrors(): Promise<ErrorLog[]> {
    return this.errorRepository.find({
      order: { timestamp: 'DESC' },
      take: 100
    });
  }

  public async getSecurityEvents(): Promise<SecurityEvent[]> {
    return this.securityRepository.find({
      order: { timestamp: 'DESC' },
      take: 100
    });
  }

  public async logError(error: ErrorDetails): Promise<void> {
    try {
      const errorLog = new ErrorLog();
      errorLog.message = error.message;
      errorLog.stack = error.stack;
      errorLog.path = error.path;
      errorLog.method = error.method;
      errorLog.userId = error.userId || undefined;
      errorLog.userAgent = error.userAgent;
      errorLog.ip = error.ip;
      errorLog.location = error.location;
      errorLog.metadata = {
        requestBody: error.requestBody,
        requestQuery: error.requestQuery,
        requestParams: error.requestParams
      };
      errorLog.timestamp = new Date(error.timestamp);

      await this.errorRepository.save(errorLog);
      this.emit('error-logged', errorLog);

      if (this.wsService) {
        this.wsService.broadcast('error-logged', errorLog);
      }
    } catch (err) {
      logger.error('Failed to log error:', err);
    }
  }

  public async logAuth(log: AuthLog): Promise<void> {
    try {
      // Add to in-memory logs
      this.authLogs.push(log);
      
      // Trim logs if they exceed the maximum
      if (this.authLogs.length > this.maxLogsToKeep) {
        this.authLogs = this.authLogs.slice(-this.maxLogsToKeep);
      }

      // Emit event for real-time monitoring
      if (this.wsService) {
        this.wsService.sendToUser(log.userId, {
          id: crypto.randomUUID(),
          content: `Authentication event: ${log.action}`,
          role: 'system',
          metadata: {
            type: 'notification',
            status: log.action === 'failed_login' ? 'error' : 'info',
            category: 'auth',
            source: {
              page: 'Authentication',
              action: log.action,
              details: {
                userId: log.userId,
                ip: log.ip,
                location: log.location
              }
            },
            timestamp: Date.now(),
            read: false
          }
        });
      }

      // Log to auth log file
      logger.info('Authentication event', {
        ...log,
        type: 'auth_log'
      });
    } catch (error) {
      logger.error('Failed to log auth event:', error);
    }
  }

  public async getAuthLogs(): Promise<AuthLog[]> {
    return this.authLogs;
  }

  public async shutdown(): Promise<void> {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.isInitialized = false;
  }
}

export const systemMetricsService = SystemMetricsService.getInstance(); 