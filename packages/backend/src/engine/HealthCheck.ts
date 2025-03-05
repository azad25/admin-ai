import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

// Define interfaces for different service types
interface DatabaseService {
  query: (sql: string) => Promise<unknown>;
}

interface WebSocketService {
  isConnected?: () => boolean;
}

interface AIService {
  isAvailable?: () => Promise<boolean>;
}

interface MetricsService {
  isOperational?: () => Promise<boolean>;
}

interface GenericService {
  healthCheck?: () => Promise<boolean>;
}

export class HealthCheck extends EventEmitter {
  private checkInterval: NodeJS.Timeout | null = null;
  private services: Map<string, unknown> = new Map();
  private healthyServices: Set<string> = new Set();
  private readonly CHECK_INTERVAL = 30000; // 30 seconds

  constructor() {
    super();
  }

  public async start(services: Map<string, unknown>): Promise<void> {
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

  private async checkServiceHealth(serviceName: string, service: unknown): Promise<boolean> {
    try {
      switch (serviceName) {
        case 'database':
          return await this.checkDatabaseHealth(this.isDatabaseService(service) ? service : null);
        case 'websocket':
          return await this.checkWebSocketHealth(this.isWebSocketService(service) ? service : null);
        case 'ai':
          return await this.checkAIServiceHealth(this.isAIService(service) ? service : null);
        case 'metrics':
          return await this.checkMetricsHealth(this.isMetricsService(service) ? service : null);
        default:
          return await this.checkGenericServiceHealth(this.isGenericService(service) ? service : null);
      }
    } catch (error) {
      logger.error(`Health check failed for ${serviceName}`, { error });
      return false;
    }
  }

  // Type guard functions
  private isDatabaseService(service: unknown): service is DatabaseService {
    return !!service && typeof (service as DatabaseService).query === 'function';
  }

  private isWebSocketService(service: unknown): service is WebSocketService {
    return !!service && (typeof (service as WebSocketService).isConnected === 'function' || (service as WebSocketService).isConnected === undefined);
  }

  private isAIService(service: unknown): service is AIService {
    return !!service && (typeof (service as AIService).isAvailable === 'function' || (service as AIService).isAvailable === undefined);
  }

  private isMetricsService(service: unknown): service is MetricsService {
    return !!service && (typeof (service as MetricsService).isOperational === 'function' || (service as MetricsService).isOperational === undefined);
  }

  private isGenericService(service: unknown): service is GenericService {
    return !!service && (typeof (service as GenericService).healthCheck === 'function' || (service as GenericService).healthCheck === undefined);
  }

  private async checkDatabaseHealth(database: DatabaseService | null): Promise<boolean> {
    try {
      if (!database) return false;
      return await database.query('SELECT 1').then(() => true);
    } catch {
      return false;
    }
  }

  private async checkWebSocketHealth(wsService: WebSocketService | null): Promise<boolean> {
    if (!wsService || !wsService.isConnected) return false;
    return wsService.isConnected();
  }

  private async checkAIServiceHealth(aiService: AIService | null): Promise<boolean> {
    if (!aiService || !aiService.isAvailable) return false;
    return await aiService.isAvailable();
  }

  private async checkMetricsHealth(metricsService: MetricsService | null): Promise<boolean> {
    if (!metricsService || !metricsService.isOperational) return false;
    return await metricsService.isOperational();
  }

  private async checkGenericServiceHealth(service: GenericService | null): Promise<boolean> {
    if (!service || !service.healthCheck) return false;
    try {
      return await service.healthCheck();
    } catch {
      return false;
    }
  }
}