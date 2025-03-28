import { SystemMetrics, SystemHealth } from '@admin-ai/shared/types/metrics';
import { logger } from './logger';
import { EventService } from './events';
import { CacheService } from './cache';

export interface MetricsCollector {
  collect(): Promise<SystemMetrics>;
}

export class MetricsService {
  private static instance: MetricsService;
  private eventService: EventService;
  private cacheService: CacheService;
  private collectors: MetricsCollector[] = [];
  private isInitialized: boolean = false;
  private readonly CACHE_KEY = 'system:metrics';
  private readonly CACHE_TTL = 300; // 5 minutes

  private constructor(eventService: EventService, cacheService: CacheService) {
    this.eventService = eventService;
    this.cacheService = cacheService;
  }

  public static getInstance(eventService: EventService, cacheService: CacheService): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService(eventService, cacheService);
    }
    return MetricsService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Register event handlers
      this.eventService.onEvent('system.metrics.update', this.handleMetricsUpdate.bind(this));
      this.eventService.onEvent('system.health.check', this.handleHealthCheck.bind(this));

      this.isInitialized = true;
      logger.info('Metrics service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize metrics service:', error);
      throw error;
    }
  }

  public registerCollector(collector: MetricsCollector): void {
    this.collectors.push(collector);
  }

  public async collectMetrics(): Promise<SystemMetrics> {
    try {
      // Try to get from cache first
      const cached = await this.cacheService.get<SystemMetrics>(this.CACHE_KEY);
      if (cached) {
        return cached;
      }

      // Collect metrics from all registered collectors
      const metricsPromises = this.collectors.map(collector => collector.collect());
      const metricsResults = await Promise.all(metricsPromises);

      // Merge metrics from all collectors
      const metrics = this.mergeMetrics(metricsResults);

      // Cache the results
      await this.cacheService.set(this.CACHE_KEY, metrics, { ttl: this.CACHE_TTL });

      // Emit metrics update event
      await this.eventService.emitSystemEvent('metrics.update', metrics);

      return metrics;
    } catch (error) {
      logger.error('Error collecting metrics:', error);
      throw error;
    }
  }

  public async getSystemHealth(): Promise<SystemHealth> {
    try {
      const metrics = await this.collectMetrics();
      return this.calculateSystemHealth(metrics);
    } catch (error) {
      logger.error('Error getting system health:', error);
      throw error;
    }
  }

  private mergeMetrics(metrics: SystemMetrics[]): SystemMetrics {
    const merged: SystemMetrics = {
      performance: {
        averageResponseTime: 0,
        throughput: 0,
        errorRate: 0,
        dataPoints: 0
      },
      resources: {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        dataPoints: 0
      },
      errors: {
        errorRate: 0,
        warningCount: 0,
        criticalCount: 0,
        dataPoints: 0
      },
      security: {
        threatCount: 0,
        vulnerabilityCount: 0,
        dataPoints: 0
      },
      timestamp: new Date().toISOString()
    };

    // Calculate averages
    metrics.forEach(metric => {
      merged.performance.averageResponseTime += metric.performance.averageResponseTime;
      merged.performance.throughput += metric.performance.throughput;
      merged.performance.errorRate += metric.performance.errorRate;
      merged.performance.dataPoints += metric.performance.dataPoints;

      merged.resources.cpuUsage += metric.resources.cpuUsage;
      merged.resources.memoryUsage += metric.resources.memoryUsage;
      merged.resources.diskUsage += metric.resources.diskUsage;
      merged.resources.dataPoints += metric.resources.dataPoints;

      merged.errors.errorRate += metric.errors.errorRate;
      merged.errors.warningCount += metric.errors.warningCount;
      merged.errors.criticalCount += metric.errors.criticalCount;
      merged.errors.dataPoints += metric.errors.dataPoints;

      merged.security.threatCount += metric.security.threatCount;
      merged.security.vulnerabilityCount += metric.security.vulnerabilityCount;
      merged.security.dataPoints += metric.security.dataPoints;
    });

    // Calculate final averages
    const count = metrics.length;
    merged.performance.averageResponseTime /= count;
    merged.performance.throughput /= count;
    merged.performance.errorRate /= count;

    merged.resources.cpuUsage /= count;
    merged.resources.memoryUsage /= count;
    merged.resources.diskUsage /= count;

    merged.errors.errorRate /= count;

    return merged;
  }

  private calculateSystemHealth(metrics: SystemMetrics): SystemHealth {
    const health: SystemHealth = {
      id: 'system-health',
      score: 100,
      status: 'healthy',
      resources: {
        cpu: {
          usage: metrics.resources.cpuUsage,
          status: this.getResourceStatus(metrics.resources.cpuUsage)
        },
        memory: {
          usage: metrics.resources.memoryUsage,
          status: this.getResourceStatus(metrics.resources.memoryUsage)
        },
        disk: {
          usage: metrics.resources.diskUsage,
          status: this.getResourceStatus(metrics.resources.diskUsage)
        },
        network: {
          status: 'normal'
        }
      },
      services: [],
      timestamp: new Date().toISOString()
    };

    // Calculate overall health score
    let score = 100;

    // Deduct points for resource usage
    if (health.resources.cpu.status === 'warning') score -= 10;
    if (health.resources.cpu.status === 'critical') score -= 20;
    if (health.resources.memory.status === 'warning') score -= 10;
    if (health.resources.memory.status === 'critical') score -= 20;
    if (health.resources.disk.status === 'warning') score -= 10;
    if (health.resources.disk.status === 'critical') score -= 20;

    // Deduct points for errors
    if (metrics.errors.errorRate > 0.05) score -= 15;
    if (metrics.errors.warningCount > 0) score -= 5;
    if (metrics.errors.criticalCount > 0) score -= 10;

    // Deduct points for security issues
    if (metrics.security.threatCount > 0) score -= 15;
    if (metrics.security.vulnerabilityCount > 0) score -= 10;

    // Update health status based on score
    health.score = Math.max(0, Math.min(100, score));
    health.status = this.getHealthStatus(health.score);

    return health;
  }

  private getResourceStatus(usage: number): 'normal' | 'warning' | 'critical' {
    if (usage >= 90) return 'critical';
    if (usage >= 80) return 'warning';
    return 'normal';
  }

  private getHealthStatus(score: number): 'healthy' | 'warning' | 'critical' {
    if (score >= 80) return 'healthy';
    if (score >= 60) return 'warning';
    return 'critical';
  }

  private async handleMetricsUpdate(event: any): Promise<void> {
    try {
      const metrics = event.payload;
      await this.cacheService.set(this.CACHE_KEY, metrics, { ttl: this.CACHE_TTL });
      logger.info('Metrics updated from event');
    } catch (error) {
      logger.error('Error handling metrics update event:', error);
    }
  }

  private async handleHealthCheck(event: any): Promise<void> {
    try {
      const health = await this.getSystemHealth();
      await this.eventService.emitSystemEvent('health.status', health);
      logger.info('Health check completed');
    } catch (error) {
      logger.error('Error handling health check event:', error);
    }
  }

  public async cleanup(): Promise<void> {
    try {
      // Remove event handlers
      this.eventService.removeEventHandler('system.metrics.update', this.handleMetricsUpdate);
      this.eventService.removeEventHandler('system.health.check', this.handleHealthCheck);

      this.isInitialized = false;
      logger.info('Metrics service cleaned up successfully');
    } catch (error) {
      logger.error('Error cleaning up metrics service:', error);
      throw error;
    }
  }
} 