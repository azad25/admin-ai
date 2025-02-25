import { EventEmitter } from '../utils/EventEmitter';
import { WebSocketService, wsService } from '../services/websocket.service';
import { AIService, aiService } from '../services/ai.service';
import { systemMetricsService } from '../services/systemMetrics.service';

interface ServiceHealth {
  isHealthy: boolean;
  lastCheck: Date;
  details?: any;
}

export class AppEngine extends EventEmitter {
  private static instance: AppEngine;
  private services: Map<string, any> = new Map();
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private isInitialized: boolean = false;

  private constructor() {
    super();
  }

  public static getInstance(): AppEngine {
    if (!AppEngine.instance) {
      AppEngine.instance = new AppEngine();
    }
    return AppEngine.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('AppEngine is already initialized');
      return;
    }

    try {
      console.info('Initializing Frontend AppEngine...');

      // Initialize core services
      await this.initializeServices();

      this.isInitialized = true;
      console.info('Frontend AppEngine initialization completed successfully');
      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize Frontend AppEngine', { error });
      this.emit('initialization_failed', error);
      throw error;
    }
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize WebSocket service
      this.services.set('websocket', wsService);
      this.updateServiceHealth('websocket', true);

      // Set AI service
      this.services.set('ai', aiService);
      this.updateServiceHealth('ai', true);

      // Set System Metrics service
      this.services.set('metrics', systemMetricsService);
      this.updateServiceHealth('metrics', true);

      console.info('Frontend core services initialized successfully');
    } catch (error) {
      console.error('Frontend service initialization failed', { error });
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
      uptime: performance.now()
    };
  }

  public async shutdown(): Promise<void> {
    try {
      console.info('Shutting down Frontend AppEngine...');
      
      // Shutdown all services in reverse order
      for (const [name, service] of Array.from(this.services).reverse()) {
        if (service && typeof service.shutdown === 'function') {
          console.info(`Shutting down ${name} service...`);
          await service.shutdown();
          this.updateServiceHealth(name, false, { reason: 'shutdown' });
        }
      }

      this.isInitialized = false;
      console.info('Frontend AppEngine shutdown completed');
      this.emit('shutdown_complete');
    } catch (error) {
      console.error('Error during Frontend shutdown', { error });
      throw error;
    }
  }
} 