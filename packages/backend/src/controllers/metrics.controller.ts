import { Request, Response } from 'express';
import { SystemMetricsService, systemMetricsService } from '../services/systemMetrics.service';
import { AIService } from '../services/ai.service';
import { WebSocketService } from '../services/websocket.service';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { User } from '../database/entities/User';
import { AIMessageMetadata } from '../types/metrics';
import { AIMessage } from '@admin-ai/shared/src/types/ai';
import { RequestWithUser } from '../types/express';

export class MetricsController {
  private systemMetricsService: SystemMetricsService;
  private aiService: AIService;
  private wsService: WebSocketService;

  constructor(aiService: AIService, wsService: WebSocketService) {
    this.aiService = aiService;
    this.wsService = wsService;
    this.systemMetricsService = systemMetricsService;
    this.systemMetricsService.initializeServices(wsService, aiService);
  }

  public getSystemHealth = async (req: RequestWithUser, res: Response) => {
    try {
      const health = await this.systemMetricsService.getSystemHealth();

      const cpuScore = health.resources.cpu.status === 'normal' ? 100 : 
                      health.resources.cpu.status === 'warning' ? 70 : 40;
      const memoryScore = health.resources.memory.status === 'normal' ? 100 : 
                         health.resources.memory.status === 'warning' ? 70 : 40;
      const diskScore = health.resources.disk.status === 'normal' ? 100 : 
                       health.resources.disk.status === 'warning' ? 70 : 40;
      
      const healthScore = Math.round((cpuScore + memoryScore + diskScore) / 3);
      
      if (req.user) {
        const metadata: AIMessageMetadata = {
          status: healthScore >= 80 ? 'success' : healthScore >= 60 ? 'warning' : 'error',
          category: 'system',
          source: {
            page: 'System Metrics',
            controller: 'MetricsController',
            action: 'getSystemHealth',
            details: {
              score: healthScore,
              issues: []
            }
          },
          timestamp: new Date().toISOString()
        };

        const message: AIMessage = {
          id: crypto.randomUUID(),
          content: `System health check completed: ${healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'degraded' : 'critical'} (${healthScore}%)`,
          role: 'system',
          timestamp: new Date().toISOString(),
          metadata: {
            ...metadata,
            type: 'notification'
          }
        };

        this.wsService.sendToUser(req.user.id, 'ai:message', message);
      }
      
      const responseHealth = {
        ...health,
        score: healthScore,
        status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'degraded' : 'critical'
      };
      
      res.json(responseHealth);
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
      const metrics: any[] = [];
      const analysis = await this.aiService.analyzeMetrics({
        cpuUsage: 0,
        memoryUsage: 0,
        errorCount: 0,
        totalRequests: metrics.length,
        activeUsers: 0
      });

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
      const locations: any[] = [];
      res.json(locations);
    } catch (error) {
      logger.error('Failed to get location heatmap:', error);
      throw new AppError(500, 'Failed to get location heatmap');
    }
  };

  public getAIMetrics = async (req: RequestWithUser, res: Response) => {
    try {
      const metrics = await this.aiService.analyzeMetrics({
        cpuUsage: 0,
        memoryUsage: 0,
        errorCount: 0,
        totalRequests: 0,
        activeUsers: 0
      });
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
      res.json([]);
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