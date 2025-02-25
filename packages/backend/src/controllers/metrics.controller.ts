import { Request, Response } from 'express';
import { SystemMetricsService } from '../services/systemMetrics.service';
import { AIService } from '../services/ai.service';
import { WebSocketService } from '../services/websocket.service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/error';
import { User } from '../database/entities/User';
import { AIMessageMetadata } from '../types/metrics';
import { AIMessage } from '@admin-ai/shared/src/types/ai';

interface RequestWithUser extends Request {
  user: User;
}

export class MetricsController {
  private systemMetricsService: SystemMetricsService;
  private aiService: AIService;
  private wsService: WebSocketService;

  constructor(aiService: AIService, wsService: WebSocketService) {
    this.aiService = aiService;
    this.wsService = wsService;
    this.systemMetricsService = new SystemMetricsService();
    this.systemMetricsService.initializeServices(wsService, aiService);
  }

  public getSystemHealth = async (req: RequestWithUser, res: Response) => {
    try {
      const health = await this.systemMetricsService.getSystemHealth();

      // Send notification for health check
      const metadata: AIMessageMetadata = {
        status: health.score >= 80 ? 'success' : health.score >= 60 ? 'warning' : 'error',
        category: 'system',
        source: {
          page: 'System Metrics',
          controller: 'MetricsController',
          action: 'getSystemHealth',
          details: {
            score: health.score,
            issues: health.issues
          }
        },
        timestamp: new Date().toISOString()
      };

      const message: AIMessage = {
        id: crypto.randomUUID(),
        content: `System health check completed: ${health.status} (${health.score}%)`,
        role: 'system',
        type: 'notification',
        timestamp: new Date().toISOString(),
        metadata
      };

      this.wsService.sendToUser(req.user.id, message);
      res.json(health);
    } catch (error) {
      logger.error('Failed to get system health:', error);
      throw new AppError(500, 'Failed to get system health');
    }
  };

  public getSystemMetrics = async (req: RequestWithUser, res: Response) => {
    try {
      const metrics = await this.systemMetricsService.getSystemMetrics();
      const analysis = await this.aiService.analyzeMetrics(metrics);

      res.json({
        metrics,
        analysis
      });
    } catch (error) {
      logger.error('Failed to get system metrics:', error);
      throw new AppError(500, 'Failed to get system metrics');
    }
  };

  public getRequestMetrics = async (req: RequestWithUser, res: Response) => {
    try {
      const rawMetrics = await this.systemMetricsService.getRequestMetrics();
      // Convert raw metrics to RequestMetric array format
      const metrics = Array.isArray(rawMetrics) ? rawMetrics : [];
      const analysis = await this.aiService.analyzeRequestMetrics(metrics);

      res.json({
        metrics,
        analysis
      });
    } catch (error) {
      logger.error('Failed to get request metrics:', error);
      throw new AppError(500, 'Failed to get request metrics');
    }
  };

  public getLocationHeatmap = async (req: RequestWithUser, res: Response) => {
    try {
      const locations = await this.systemMetricsService.getLocationHeatmap();
      res.json(locations);
    } catch (error) {
      logger.error('Failed to get location heatmap:', error);
      throw new AppError(500, 'Failed to get location heatmap');
    }
  };

  public getAIMetrics = async (req: RequestWithUser, res: Response) => {
    try {
      const metrics = await this.aiService.getMetrics();
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get AI metrics:', error);
      throw new AppError(500, 'Failed to get AI metrics');
    }
  };

  public getPerformanceInsights = async (req: RequestWithUser, res: Response) => {
    try {
      const insights = await this.systemMetricsService.getPerformanceInsights();
      res.json(insights);
    } catch (error) {
      logger.error('Failed to get performance insights:', error);
      throw new AppError(500, 'Failed to get performance insights');
    }
  };

  public getSecurityInsights = async (req: RequestWithUser, res: Response) => {
    try {
      const insights = await this.systemMetricsService.getSecurityInsights();
      res.json(insights);
    } catch (error) {
      logger.error('Failed to get security insights:', error);
      throw new AppError(500, 'Failed to get security insights');
    }
  };

  public getUsageInsights = async (req: RequestWithUser, res: Response) => {
    try {
      const insights = await this.systemMetricsService.getUsageInsights();
      res.json(insights);
    } catch (error) {
      logger.error('Failed to get usage insights:', error);
      throw new AppError(500, 'Failed to get usage insights');
    }
  };

  public getRecentLogs = async (req: RequestWithUser, res: Response) => {
    try {
      const logs = await this.systemMetricsService.getRecentLogs();
      res.json(logs);
    } catch (error) {
      logger.error('Failed to get recent logs:', error);
      throw new AppError(500, 'Failed to get recent logs');
    }
  };

  public getRecentErrors = async (req: RequestWithUser, res: Response) => {
    try {
      const errors = await this.systemMetricsService.getRecentErrors();
      res.json(errors);
    } catch (error) {
      logger.error('Failed to get recent errors:', error);
      throw new AppError(500, 'Failed to get recent errors');
    }
  };

  public getAuthLogs = async (req: RequestWithUser, res: Response) => {
    try {
      const logs = await this.systemMetricsService.getAuthLogs();
      res.json(logs);
    } catch (error) {
      logger.error('Failed to get auth logs:', error);
      throw new AppError(500, 'Failed to get auth logs');
    }
  };
} 