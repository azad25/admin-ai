import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export class HealthCheck extends EventEmitter {
  private checkInterval: NodeJS.Timeout | null = null;
  private services: Map<string, any> = new Map();
  private healthyServices: Set<string> = new Set();
  private readonly CHECK_INTERVAL = 30000; // 30 seconds

  constructor() {
    super();
  }

  public async start(services: Map<string, any>): Promise<void> {
    this.services = services;
    await this.performHealthCheck();
    this.checkInterval = setInterval(() => this.performHealthCheck(), this.CHECK_INTERVAL);
  }

  public async stop(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async performHealthCheck(): Promise<void> {
    for (const [serviceName, service] of this.services) {
      try {
        const isHealthy = await this.checkServiceHealth(serviceName, service);
        
        if (isHealthy && !this.healthyServices.has(serviceName)) {
          this.healthyServices.add(serviceName);
          this.emit('service_healthy', serviceName);
          logger.info(`Service ${serviceName} is healthy`);
        } else if (!isHealthy && this.healthyServices.has(serviceName)) {
          this.healthyServices.delete(serviceName);
          this.emit('service_unhealthy', serviceName);
          logger.error(`Service ${serviceName} is unhealthy`);
        }
      } catch (error) {
        logger.error(`Error checking health of service ${serviceName}`, { error });
        this.emit('health_check_error', { serviceName, error });
      }
    }
  }

  private async checkServiceHealth(serviceName: string, service: any): Promise<boolean> {
    try {
      switch (serviceName) {
        case 'database':
          return await this.checkDatabaseHealth(service);
        case 'websocket':
          return await this.checkWebSocketHealth(service);
        case 'ai':
          return await this.checkAIServiceHealth(service);
        case 'metrics':
          return await this.checkMetricsHealth(service);
        default:
          return await this.checkGenericServiceHealth(service);
      }
    } catch (error) {
      logger.error(`Health check failed for ${serviceName}`, { error });
      return false;
    }
  }

  private async checkDatabaseHealth(database: any): Promise<boolean> {
    try {
      return await database.query('SELECT 1').then(() => true);
    } catch {
      return false;
    }
  }

  private async checkWebSocketHealth(wsService: any): Promise<boolean> {
    return wsService && wsService.isConnected && wsService.isConnected();
  }

  private async checkAIServiceHealth(aiService: any): Promise<boolean> {
    return aiService && typeof aiService.isAvailable === 'function' && await aiService.isAvailable();
  }

  private async checkMetricsHealth(metricsService: any): Promise<boolean> {
    return metricsService && typeof metricsService.isOperational === 'function' && await metricsService.isOperational();
  }

  private async checkGenericServiceHealth(service: any): Promise<boolean> {
    return service && 
           typeof service.healthCheck === 'function' && 
           await service.healthCheck()
           .catch(() => false);
  }
} 