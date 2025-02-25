import { EventEmitter } from 'events';
import axios from 'axios';

export class HealthCheck extends EventEmitter {
  private checkInterval: number | null = null;
  private services: Map<string, any> = new Map();
  private healthyServices: Set<string> = new Set();
  private readonly CHECK_INTERVAL = 30000; // 30 seconds

  constructor() {
    super();
  }

  public async start(services: Map<string, any>): Promise<void> {
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

  private async checkServiceHealth(serviceName: string, service: any): Promise<boolean> {
    try {
      switch (serviceName) {
        case 'api':
          return await this.checkAPIHealth(service);
        case 'websocket':
          return this.checkWebSocketHealth(service);
        default:
          return await this.checkGenericServiceHealth(service);
      }
    } catch (error) {
      console.error(`Health check failed for frontend service ${serviceName}`, error);
      return false;
    }
  }

  private async checkAPIHealth(apiService: any): Promise<boolean> {
    try {
      const response = await axios.get(`${apiService.baseURL}/health`);
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private checkWebSocketHealth(ws: WebSocket): boolean {
    return ws.readyState === WebSocket.OPEN;
  }

  private async checkGenericServiceHealth(service: any): Promise<boolean> {
    return service && 
           typeof service.healthCheck === 'function' && 
           await service.healthCheck()
           .catch(() => false);
  }
} 