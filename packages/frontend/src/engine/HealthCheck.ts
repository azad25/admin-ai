import { EventEmitter } from 'events';
import axios from 'axios';

export class HealthCheck extends EventEmitter {
  private checkInterval: number | null = null;
  private services: Map<string, unknown> = new Map();
  private healthyServices: Set<string> = new Set();
  private readonly CHECK_INTERVAL = 30000; // 30 seconds

  constructor() {
    super();
  }

  public async start(services: Map<string, unknown>): Promise<void> {
    this.services = services;
    await this.performHealthCheck();
    this.checkInterval = window.setInterval(() => this.performHealthCheck(), this.CHECK_INTERVAL);
  }

  public async stop(): Promise<void> {
    if (this.checkInterval) {
      window.clearInterval(this.checkInterval);
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
          console.info(`Frontend service ${serviceName} is healthy`);
        } else if (!isHealthy && this.healthyServices.has(serviceName)) {
          this.healthyServices.delete(serviceName);
          this.emit('service_unhealthy', serviceName);
          console.error(`Frontend service ${serviceName} is unhealthy`);
        }
      } catch (error) {
        console.error(`Error checking health of frontend service ${serviceName}`, error);
        this.emit('health_check_error', { serviceName, error });
      }
    }
  }

  private async checkServiceHealth(serviceName: string, service: unknown): Promise<boolean> {
    try {
      switch (serviceName) {
        case 'api':
          return await this.checkAPIHealth(this.isAPIService(service) ? service : null);
        case 'websocket':
          return this.checkWebSocketHealth(this.isWebSocketService(service) ? service : null);
        default:
          return await this.checkGenericServiceHealth(this.isGenericService(service) ? service : null);
      }
    } catch (error) {
      console.error(`Health check failed for frontend service ${serviceName}`, error);
      return false;
    }
  }

  private isAPIService(service: unknown): service is { baseURL: string } {
    return !!service && typeof (service as { baseURL: string }).baseURL === 'string';
  }

  private isWebSocketService(service: unknown): service is WebSocket {
    return !!service && service instanceof WebSocket;
  }

  private isGenericService(service: unknown): service is { healthCheck?: () => Promise<boolean> } {
    return !!service && typeof (service as { healthCheck?: () => Promise<boolean> }).healthCheck === 'function';
  }

  private async checkAPIHealth(apiService: { baseURL: string } | null): Promise<boolean> {
    try {
      if (!apiService) return false;
      const response = await axios.get(`${apiService.baseURL}/health`);
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private checkWebSocketHealth(ws: WebSocket | null): boolean {
    return !!ws && ws.readyState === WebSocket.OPEN;
  }

  private async checkGenericServiceHealth(service: { healthCheck?: () => Promise<boolean> } | null): Promise<boolean> {
    return !!service && 
           typeof service.healthCheck === 'function' && 
           await service.healthCheck()
           .catch(() => false);
  }
}