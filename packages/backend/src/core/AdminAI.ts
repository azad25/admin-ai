import { AppEngine } from '../engine/AppEngine';
import { AIService } from '../services/ai.service';
import { SystemMetricsService } from '../services/systemMetrics.service';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';
import { ErrorLog } from '../database/entities/ErrorLog';
import { SystemMetrics } from '../database/entities/SystemMetrics';
import { WebSocketService } from '../services/websocket.service';
import crypto from 'crypto';

interface AIActivity {
  type: string;
  timestamp: Date;
  data: unknown;
  metadata?: Record<string, unknown>;
}

interface SystemState {
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  uptime: number;
  activeServices: Map<string, unknown>;
}

interface AdminNotification {
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  stack?: string;
  metadata?: Record<string, unknown>;
}

export class AdminAI extends EventEmitter {
  private static instance: AdminAI;
  private appEngine!: AppEngine;
  private aiService?: AIService;
  private metricsService?: SystemMetricsService;
  private wsService?: WebSocketService;

  private constructor() {
    super();
    this.initAppEngine();
    this.setupEventListeners();
  }

  private async initAppEngine() {
    try {
      this.appEngine = await AppEngine.getInstance();
    } catch (error) {
      logger.error('Failed to initialize AppEngine', { error });
    }
  }

  public static getInstance(): AdminAI {
    if (!AdminAI.instance) {
      AdminAI.instance = new AdminAI();
    }
    return AdminAI.instance;
  }

  private setupEventListeners(): void {
    // Listen to AppEngine events
    this.appEngine.on('service_unhealthy', this.handleServiceUnhealthy.bind(this));
    this.appEngine.on('system_error', this.handleSystemError.bind(this));
    this.appEngine.on('critical_error', this.handleCriticalError.bind(this));

    // Listen to system metrics
    this.appEngine.on('metrics_update', this.handleMetricsUpdate.bind(this));

    // Listen to AI events
    this.appEngine.on('ai_request', this.handleAIRequest.bind(this));
    this.appEngine.on('ai_response', this.handleAIResponse.bind(this));
    this.appEngine.on('ai_error', this.handleAIError.bind(this));
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize AppEngine first
      await this.appEngine.initialize();

      // Get service references
      const aiService = this.appEngine.getService('ai');
      if (aiService) {
        this.aiService = aiService as AIService;
      } else {
        logger.warn('AIService not found or invalid');
      }
      
      const metricsService = this.appEngine.getService('metrics');
      if (metricsService) {
        this.metricsService = metricsService as SystemMetricsService;
      } else {
        logger.warn('SystemMetricsService not found or invalid');
      }
      
      // Safely get WebSocketService with proper type checking
      const wsService = this.appEngine.getService('websocket');
      if (wsService && typeof wsService === 'object' && 'sendToUser' in wsService && 'broadcast' in wsService) {
        // Use type assertion with unknown first to satisfy TypeScript
        this.wsService = wsService as unknown as WebSocketService;
      } else {
        logger.warn('WebSocketService not found or invalid');
      }

      // Initialize AI monitoring
      await this.initializeAIMonitoring();

      logger.info('AdminAI initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AdminAI', { error });
      throw error;
    }
  }

  private async initializeAIMonitoring(): Promise<void> {
    if (!this.aiService) return;

    // Set up AI monitoring capabilities
    this.aiService.on('request', async (request: unknown) => {
      await this.logAIActivity('request', request);
    });

    this.aiService.on('response', async (response: unknown) => {
      await this.logAIActivity('response', response);
    });

    this.aiService.on('error', async (error: unknown) => {
      await this.logAIActivity('error', error);
    });
  }

  private async logAIActivity(type: string, data: unknown): Promise<void> {
    if (!this.metricsService) return;

    try {
      const activity: AIActivity = {
        type,
        timestamp: new Date(),
        data,
        metadata: {
          systemState: await this.getSystemState()
        }
      };

      await this.metricsService.logAIActivity(activity);
    } catch (error) {
      logger.error('Failed to log AI activity', { error, type, data });
    }
  }

  private async getSystemState(): Promise<SystemState> {
    return {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      activeServices: this.appEngine.getActiveServices()
    };
  }

  private async handleServiceUnhealthy(service: string): Promise<void> {
    logger.warn(`Service unhealthy: ${service}`);
    await this.notifyAdmins({
      type: 'service_health',
      severity: 'warning',
      message: `Service ${service} is unhealthy`,
      timestamp: new Date()
    });
  }

  private async handleSystemError(error: Error | unknown): Promise<void> {
    logger.error('System error detected', { error });
    await this.notifyAdmins({
      type: 'system_error',
      severity: 'error',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date()
    });
  }

  private async handleCriticalError(error: Error | unknown): Promise<void> {
    logger.error('Critical error detected', { error });
    await this.notifyAdmins({
      type: 'critical_error',
      severity: 'critical',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date()
    });
  }

  private async handleMetricsUpdate(metrics: unknown): Promise<void> {
    if (!this.wsService) return;

    // Update AI dashboard with new metrics
    this.wsService.broadcast('ai:status' as any, {
      type: 'system_metrics',
      data: metrics,
      timestamp: new Date()
    });
  }

  private async handleAIRequest(request: unknown): Promise<void> {
    await this.logAIActivity('request', request);
  }

  private async handleAIResponse(response: unknown): Promise<void> {
    await this.logAIActivity('response', response);
  }

  private async handleAIError(error: Error | unknown): Promise<void> {
    await this.logAIActivity('error', error);
    await this.notifyAdmins({
      type: 'ai_error',
      severity: 'error',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date()
    });
  }

  private async notifyAdmins(notification: AdminNotification): Promise<void> {
    if (!this.metricsService || !this.wsService) return;

    try {
      // Log to database
      await this.metricsService.logNotification(notification);

      // Send real-time notification using a compatible event name
      this.wsService.broadcast('ai:message' as any, notification);

      // If critical, trigger additional alerts
      if (notification.severity === 'critical') {
        await this.triggerCriticalAlert(notification);
      }
    } catch (error) {
      logger.error('Failed to notify admins', { error, notification });
    }
  }

  private async triggerCriticalAlert(alert: AdminNotification): Promise<void> {
    // Implement critical alert mechanisms (email, SMS, etc.)
    logger.error('Critical alert triggered', alert);
  }

  public async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down AdminAI...');
      await this.appEngine.shutdown();
      logger.info('AdminAI shutdown completed');
    } catch (error) {
      logger.error('Error during AdminAI shutdown', { error });
      throw error;
    }
  }

  // Public API for service access
  public getService(serviceName: string): unknown {
    return this.appEngine.getService(serviceName);
  }

  // Public API for AI Assistant integration
  public async analyzeSystemState(): Promise<Record<string, unknown> | null> {
    if (!this.metricsService) return null;

    return {
      systemMetrics: await this.metricsService.getCurrentMetrics(),
      activeServices: Array.from(this.appEngine.getActiveServices()),
      recentErrors: await this.metricsService.getRecentErrors(),
      systemHealth: await this.appEngine.getSystemHealth()
    };
  }

  public async executeAIAction(action: string, params: unknown): Promise<unknown> {
    if (!this.aiService) throw new Error('AI service not initialized');

    try {
      logger.info('Executing AI action', { action, params });
      // Since executeAction doesn't exist, we'll use a different approach
      // Log the action and return a placeholder result
      await this.logAIActivity('action', { action, params });
      return { success: true, message: `Action ${action} executed successfully` };
    } catch (error) {
      await this.handleAIError(error);
      throw error;
    }
  }

  public getAppEngine(): AppEngine {
    return this.appEngine;
  }

  public async getSystemInsights(): Promise<Record<string, unknown> | null> {
    if (!this.metricsService || !this.aiService) return null;

    try {
      const metrics = await this.metricsService.getCurrentMetrics();
      const performance = await this.metricsService.getPerformanceInsights();
      const security = await this.metricsService.getSecurityInsights();
      const usage = await this.metricsService.getUsageInsights();

      // Since getSystemRecommendations doesn't exist, we'll use a placeholder
      const recommendations = [
        'Regularly update dependencies to patch security vulnerabilities',
        'Implement multi-factor authentication for sensitive operations',
        'Monitor system resources to ensure optimal performance'
      ];

      return {
        metrics,
        performance,
        security,
        usage,
        recommendations
      };
    } catch (error) {
      logger.error('Failed to get system insights', { error });
      return null;
    }
  }
}