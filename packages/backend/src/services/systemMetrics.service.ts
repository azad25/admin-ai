import os from 'os';
import * as fs from 'fs';
import { logger } from '../utils/logger';
import { AppDataSource } from '../database';
import { WebSocketService } from './websocket.service';
import { AIService } from './ai.service';
import { BaseLog } from '@admin-ai/shared/src/types/logs';
import { SystemMetrics as DBSystemMetrics } from '../database/entities/SystemMetrics';
import { ErrorLog as DBErrorLog } from '../database/entities/ErrorLog';
import { RequestLocation as DBRequestLocation } from '../database/entities/RequestLocation';
import { Repository, MoreThan } from 'typeorm';
import { EventEmitter } from 'events';
import { AISettingsService } from './aiSettings.service';
import { AppError } from '../middleware/errorHandler';
import { SecurityEvent } from '../database/entities/SecurityEvent';
import { v4 as uuidv4 } from 'uuid';
import { CacheService } from './cache.service';
import type { AIAnalysis } from '@admin-ai/shared/src/types/ai';
import type { SystemHealth, SystemMetrics } from '@admin-ai/shared/src/types/metrics';
import type { ErrorLog } from '@admin-ai/shared/src/types/error';
import type { WebSocketEvents } from '@admin-ai/shared/src/types/websocket';

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

const MAX_ERROR_LOGS = 100;

const CACHE_KEYS = {
  SYSTEM_HEALTH: 'system:health',
  SYSTEM_METRICS: 'system:metrics',
  ERROR_LOGS: 'system:errors',
  AI_ANALYSIS: 'system:ai:analysis'
};

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
  private metricsRepository!: Repository<DBSystemMetrics>;
  private errorRepository!: Repository<DBErrorLog>;
  private locationRepository!: Repository<DBRequestLocation>;
  private securityRepository!: Repository<SecurityEvent>;
  private isInitialized = false;
  private readonly METRICS_INTERVAL = 60000; // 1 minute
  private readonly cacheService: CacheService;
  private lastBroadcast: number = 0;
  private readonly broadcastDebounceMs = 5000;

  private constructor() {
    super();
    this.startTime = Date.now();
    this.cacheService = CacheService.getInstance();
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
      
      // Initialize AISettingsService
      const aiSettingsService = await AISettingsService.getInstance();
      if (aiSettingsService instanceof AISettingsService) {
        this.aiSettingsService = aiSettingsService;
      }

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
      this.metricsRepository = AppDataSource.getRepository(DBSystemMetrics);
      this.errorRepository = AppDataSource.getRepository(DBErrorLog);
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
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: 'up',
          lastCheck: new Date().toISOString(),
          message: 'Database is healthy'
        }
      },
      resources: {
        cpu: {
          usage: cpuUsage,
          status: cpuUsage > 0.8 ? 'critical' : cpuUsage > 0.6 ? 'warning' : 'normal'
        },
        memory: {
          usage: memoryUsage,
          status: memoryUsage > 0.9 ? 'critical' : memoryUsage > 0.7 ? 'warning' : 'normal'
        },
        disk: {
          usage: 0, // TODO: Implement disk usage check
          status: 'normal'
        }
      }
    };

    return health;
  }

  public async getSystemMetrics(): Promise<SystemMetrics> {
    const metrics = new DBSystemMetrics();
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

  public async getRecentErrors(): Promise<DBErrorLog[]> {
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

  public async logError(error: Partial<ErrorLog>): Promise<void> {
    try {
      const errorLog: ErrorLog = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        type: error.type || 'system_error',
        message: error.message || 'Unknown error',
        stack: error.stack,
        metadata: {
          severity: 'high',
          source: 'monitoring_service',
          details: {
            context: 'metrics_update'
          }
        }
      };

      const recentErrors = await this.getRecentErrors();
      const trimmedErrors = [...recentErrors, errorLog].slice(-MAX_ERROR_LOGS);
      await this.cacheService.set(CACHE_KEYS.ERROR_LOGS, trimmedErrors);

      // Broadcast error to connected clients
      if (this.wsService) {
        this.wsService.broadcast('error:new', errorLog);
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
        const activityData: WebSocketEvents['activity:ai'] = {
          type: 'auth',
          data: {
            userId: log.userId,
            action: log.action,
            timestamp: new Date().toISOString(),
            details: {
              ip: log.ip,
              location: log.location,
              userAgent: log.userAgent
            }
          }
        };
        this.wsService.broadcast('activity:ai', activityData);
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

  public async logAIActivity(activity: AIActivity): Promise<void> {
    try {
      // Store AI activity in database
      const metric = new DBSystemMetrics();
      metric.timestamp = activity.timestamp;
      metric.type = `ai_${activity.type}`;
      metric.value = 1; // Count of activity
      metric.metadata = {
        activityType: activity.type,
        activityData: activity.data,
        ...activity.metadata
      };

      await this.metricsRepository.save(metric);
      
      // Emit event for real-time monitoring
      this.emit('ai-activity', activity);
      
      if (this.wsService) {
        this.wsService.broadcast('activity:ai', {
          type: 'activity',
          data: {
            userId: activity.data.userId,
            action: activity.type,
            timestamp: activity.timestamp.toISOString(),
            details: activity.data
          }
        });
      }
      
      logger.debug('AI activity logged', { type: activity.type });
    } catch (error) {
      logger.error('Failed to log AI activity:', error);
    }
  }

  public async logNotification(notification: SystemNotification): Promise<void> {
    try {
      // Store notification in database as a system metric
      const metric = new DBSystemMetrics();
      metric.timestamp = notification.timestamp;
      metric.type = `notification_${notification.type}`;
      metric.value = notification.severity === 'critical' ? 3 : 
                    notification.severity === 'error' ? 2 : 
                    notification.severity === 'warning' ? 1 : 0;
      metric.metadata = {
        notificationType: notification.type,
        severity: notification.severity,
        message: notification.message,
        ...notification.metadata
      };

      await this.metricsRepository.save(metric);
      
      // Emit event for real-time monitoring
      this.emit('notification', notification);
      
      // Broadcast notification to WebSocket clients
      if (this.wsService) {
        const adminNotification: WebSocketEvents['admin:notification'] = {
          id: uuidv4(),
          type: notification.type,
          message: notification.message,
          timestamp: notification.timestamp.toISOString(),
          metadata: notification.metadata
        };
        this.wsService.broadcast('admin:notification', adminNotification);
      }
      
      logger.info(`System notification: ${notification.message}`, { 
        type: notification.type,
        severity: notification.severity
      });
    } catch (error) {
      logger.error('Failed to log notification:', error);
    }
  }

  public async getCurrentMetrics(): Promise<SystemMetrics | null> {
    try {
      // Get the most recent metrics from the database
      const latestMetrics = await this.metricsRepository.findOne({
        order: { timestamp: 'DESC' }
      });
      
      if (!latestMetrics) {
        // If no metrics exist yet, collect and return current metrics
        return await this.getSystemMetrics();
      }
      
      return latestMetrics;
    } catch (error) {
      logger.error('Failed to get current metrics:', error);
      return null;
    }
  }

  public async getPerformanceInsights(): Promise<Record<string, any>> {
    try {
      // Get metrics from the last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const metrics = await this.metricsRepository.find({
        where: {
          timestamp: MoreThan(oneDayAgo)
        },
        order: { timestamp: 'ASC' }
      });
      
      // Calculate performance metrics
      const cpuUsageHistory = metrics.map(m => ({ timestamp: m.timestamp, value: m.cpuUsage }));
      const memoryUsageHistory = metrics.map(m => ({ timestamp: m.timestamp, value: m.memoryUsage }));
      const responseTimeHistory = metrics.map(m => ({ timestamp: m.timestamp, value: m.averageResponseTime }));
      
      // Calculate averages
      const avgCpuUsage = cpuUsageHistory.reduce((sum, item) => sum + (item.value || 0), 0) / cpuUsageHistory.length || 0;
      const avgMemoryUsage = memoryUsageHistory.reduce((sum, item) => sum + (item.value || 0), 0) / memoryUsageHistory.length || 0;
      const avgResponseTime = responseTimeHistory.reduce((sum, item) => sum + (item.value || 0), 0) / responseTimeHistory.length || 0;
      
      return {
        cpuUsage: {
          current: cpuUsageHistory.length > 0 ? cpuUsageHistory[cpuUsageHistory.length - 1].value : 0,
          average: avgCpuUsage,
          history: cpuUsageHistory
        },
        memoryUsage: {
          current: memoryUsageHistory.length > 0 ? memoryUsageHistory[memoryUsageHistory.length - 1].value : 0,
          average: avgMemoryUsage,
          history: memoryUsageHistory
        },
        responseTime: {
          current: responseTimeHistory.length > 0 ? responseTimeHistory[responseTimeHistory.length - 1].value : 0,
          average: avgResponseTime,
          history: responseTimeHistory
        },
        uptime: process.uptime(),
        lastRestart: new Date(Date.now() - (process.uptime() * 1000))
      };
    } catch (error) {
      logger.error('Failed to get performance insights:', error);
      return {
        error: 'Failed to retrieve performance insights',
        cpuUsage: { current: 0, average: 0, history: [] },
        memoryUsage: { current: 0, average: 0, history: [] },
        responseTime: { current: 0, average: 0, history: [] },
        uptime: process.uptime()
      };
    }
  }

  public async getSecurityInsights(): Promise<Record<string, any>> {
    try {
      // Get security events from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const securityEvents = await this.securityRepository.find({
        where: {
          timestamp: MoreThan(sevenDaysAgo)
        },
        order: { timestamp: 'DESC' }
      });
      
      // Get failed login attempts
      const failedLogins = this.authLogs.filter(log => 
        log.action === 'failed_login' && 
        new Date(log.timestamp).getTime() > sevenDaysAgo.getTime()
      );
      
      // Group by IP to detect potential brute force attacks
      const ipAttempts = new Map<string, number>();
      failedLogins.forEach(log => {
        const count = ipAttempts.get(log.ip) || 0;
        ipAttempts.set(log.ip, count + 1);
      });
      
      const suspiciousIPs = Array.from(ipAttempts.entries())
        .filter(([_, count]) => count > 5)
        .map(([ip, count]) => ({ ip, count }));
      
      return {
        recentSecurityEvents: securityEvents,
        failedLoginAttempts: failedLogins.length,
        suspiciousIPs,
        securityScore: this.calculateSecurityScore(securityEvents, suspiciousIPs.length),
        recommendations: this.generateSecurityRecommendations(securityEvents, suspiciousIPs)
      };
    } catch (error) {
      logger.error('Failed to get security insights:', error);
      return {
        error: 'Failed to retrieve security insights',
        recentSecurityEvents: [],
        failedLoginAttempts: 0,
        suspiciousIPs: [],
        securityScore: 0
      };
    }
  }

  private calculateSecurityScore(events: SecurityEvent[], suspiciousIPCount: number): number {
    // Start with a perfect score and deduct based on security issues
    let score = 100;
    
    // Deduct for each critical security event
    const criticalEvents = events.filter(e => e.severity === 'critical');
    score -= criticalEvents.length * 10;
    
    // Deduct for suspicious IPs
    score -= suspiciousIPCount * 5;
    
    // Ensure score stays within 0-100 range
    return Math.max(0, Math.min(100, score));
  }

  private generateSecurityRecommendations(events: SecurityEvent[], suspiciousIPs: {ip: string, count: number}[]): string[] {
    const recommendations: string[] = [];
    
    if (suspiciousIPs.length > 0) {
      recommendations.push('Consider implementing IP-based rate limiting for authentication endpoints');
      recommendations.push('Review and potentially block suspicious IPs with multiple failed login attempts');
    }
    
    if (events.some(e => e.type === 'unauthorized_access')) {
      recommendations.push('Review access control policies and user permissions');
    }
    
    if (events.some(e => e.type === 'data_leak')) {
      recommendations.push('Audit data access patterns and implement additional encryption');
    }
    
    // Add default recommendations if none were generated
    if (recommendations.length === 0) {
      recommendations.push('Regularly update dependencies to patch security vulnerabilities');
      recommendations.push('Implement multi-factor authentication for sensitive operations');
    }
    
    return recommendations;
  }

  public async getUsageInsights(): Promise<Record<string, any>> {
    try {
      // Get metrics from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const metrics = await this.metricsRepository.find({
        where: {
          timestamp: MoreThan(thirtyDaysAgo)
        },
        order: { timestamp: 'ASC' }
      });
      
      // Calculate daily active users
      const dailyActiveUsers = new Map<string, number>();
      this.authLogs.forEach(log => {
        if (log.action === 'login' && new Date(log.timestamp).getTime() > thirtyDaysAgo.getTime()) {
          const dateKey = new Date(log.timestamp).toISOString().split('T')[0];
          const uniqueKey = `${dateKey}-${log.userId}`;
          dailyActiveUsers.set(uniqueKey, 1);
        }
      });
      
      // Group by date
      const dailyUsers = new Map<string, number>();
      Array.from(dailyActiveUsers.keys()).forEach(key => {
        const dateKey = key.split('-')[0];
        const count = dailyUsers.get(dateKey) || 0;
        dailyUsers.set(dateKey, count + 1);
      });
      
      // Format for chart display
      const userActivity = Array.from(dailyUsers.entries()).map(([date, count]) => ({
        date,
        activeUsers: count
      }));
      
      // Calculate request metrics
      const requestsByPath = new Map<string, number>();
      this.requestMetrics.forEach(req => {
        if (new Date(req.timestamp).getTime() > thirtyDaysAgo.getTime()) {
          const count = requestsByPath.get(req.path) || 0;
          requestsByPath.set(req.path, count + 1);
        }
      });
      
      // Get top paths
      const topPaths = Array.from(requestsByPath.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, count]) => ({ path, count }));
      
      return {
        userActivity,
        totalActiveUsers: dailyActiveUsers.size,
        averageDailyActiveUsers: userActivity.reduce((sum, day) => sum + day.activeUsers, 0) / userActivity.length || 0,
        topPaths,
        totalRequests: this.requestMetrics.filter(req => 
          new Date(req.timestamp).getTime() > thirtyDaysAgo.getTime()
        ).length,
        requestTrend: this.calculateRequestTrend()
      };
    } catch (error) {
      logger.error('Failed to get usage insights:', error);
      return {
        error: 'Failed to retrieve usage insights',
        userActivity: [],
        totalActiveUsers: 0,
        averageDailyActiveUsers: 0,
        topPaths: [],
        totalRequests: 0
      };
    }
  }

  private calculateRequestTrend(): Record<string, any> {
    // Calculate request trend over the last 7 days vs previous 7 days
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);
    
    const currentPeriodRequests = this.requestMetrics.filter(req => 
      new Date(req.timestamp).getTime() > sevenDaysAgo
    ).length;
    
    const previousPeriodRequests = this.requestMetrics.filter(req => 
      new Date(req.timestamp).getTime() > fourteenDaysAgo && 
      new Date(req.timestamp).getTime() <= sevenDaysAgo
    ).length;
    
    const percentChange = previousPeriodRequests === 0 
      ? 100 // If previous period had 0 requests, consider it 100% growth
      : ((currentPeriodRequests - previousPeriodRequests) / previousPeriodRequests) * 100;
    
    return {
      currentPeriodRequests,
      previousPeriodRequests,
      percentChange,
      trend: percentChange > 0 ? 'increasing' : percentChange < 0 ? 'decreasing' : 'stable'
    };
  }

  public logRequest(metric: RequestMetric): void {
    try {
      // Add to in-memory metrics
      this.requestMetrics.push(metric);
      
      // Trim metrics if they exceed the maximum
      if (this.requestMetrics.length > this.maxLogsToKeep) {
        this.requestMetrics = this.requestMetrics.slice(-this.maxLogsToKeep);
      }

      // Update location data if available
      if (metric.location) {
        const locationKey = `${metric.location.country}-${metric.location.city}`;
        const existingLocation = this.requestLocations.get(locationKey);
        
        if (existingLocation) {
          existingLocation.count += 1;
          existingLocation.lastSeen = metric.timestamp;
          
          // Track unique IPs
          if (!this.locationIps.has(locationKey)) {
            this.locationIps.set(locationKey, new Set());
          }
          this.locationIps.get(locationKey)?.add(metric.ip);
          existingLocation.uniqueIps = this.locationIps.get(locationKey)?.size || 0;
        } else {
          this.requestLocations.set(locationKey, {
            ip: metric.ip,
            latitude: metric.location.latitude,
            longitude: metric.location.longitude,
            count: 1,
            lastSeen: metric.timestamp,
            city: metric.location.city,
            country: metric.location.country,
            uniqueIps: 1
          });
          
          this.locationIps.set(locationKey, new Set([metric.ip]));
        }
      }
      
      // Log to request log file
      logger.debug('Request tracked', {
        ...metric,
        type: 'request_metric'
      });
    } catch (error) {
      logger.error('Failed to log request metric:', error);
    }
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