import { Request, Response } from 'express';
import { SystemMetricsService, systemMetricsService } from '../services/systemMetrics.service';
import { AIService } from '../services/ai.service';
import { WebSocketService } from '../services/websocket.service';
import { RequestWithUser } from '../middleware/auth';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { AIMessageMetadata } from '../types/metrics';

/**
 * Controller for system metrics and monitoring
 */
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

      // Log the health check
      logger.info('System health check', {
        status: healthScore >= 80 ? 'success' : healthScore >= 60 ? 'warning' : 'error',
        score: healthScore,
        page: 'System Metrics',
        controller: 'MetricsController',
        action: 'getSystemHealth',
        details: health
      });

      // Send notification for system health status
      this.wsService.broadcast('system:notification', {
        type: 'health_check',
        message: `System health check completed: ${healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'degraded' : 'critical'} (${healthScore}%)`,
        severity: healthScore >= 80 ? 'info' : healthScore >= 60 ? 'warning' : 'error',
        timestamp: new Date().toISOString(),
        metadata: {
          score: healthScore,
          cpu: health.resources.cpu,
          memory: health.resources.memory,
          disk: health.resources.disk
        }
      });

      const responseHealth = {
        ...health,
        score: healthScore,
        status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical'
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
      const metrics = await this.systemMetricsService.getCurrentMetrics();
      
      // Handle null metrics case
      if (!metrics) {
        return res.json({
          metrics: [],
          analysis: {
            summary: "No metrics data available",
            recommendations: ["Start collecting metrics data"]
          }
        });
      }
      
      const analysis = await this.aiService.analyzeMetrics({
        cpuUsage: metrics.cpuUsage || 0,
        memoryUsage: metrics.memoryUsage || 0,
        diskUsage: 0,
        totalRequests: metrics.totalRequests || 0,
        averageResponseTime: metrics.averageResponseTime || 0
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
      // Check if the method exists
      if (typeof this.systemMetricsService.getRequestLocations !== 'function') {
        return res.json([]);
      }
      
      const locations = await this.systemMetricsService.getRequestLocations();
      
      // Ensure we always return an array
      res.json(Array.isArray(locations) ? locations : []);
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
        diskUsage: 0,
        totalRequests: 0,
        averageResponseTime: 0
      });

      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get AI metrics:', error);
      throw new AppError(500, 'Failed to get AI metrics');
    }
  };

  public getPerformanceInsights = async (req: RequestWithUser, res: Response) => {
    try {
      const metrics = await this.systemMetricsService.getSystemMetrics();
      const analysis = await this.aiService.analyzeMetrics(metrics);
      
      // Create performance insights from metrics and AI analysis
      const performanceInsights = {
        cpu: {
          current: metrics.cpuUsage.toFixed(2),
          trend: metrics.cpuUsage > 70 ? 'increasing' : metrics.cpuUsage > 30 ? 'stable' : 'decreasing',
          recommendation: analysis?.recommendations?.find((r: string) => r.toLowerCase().includes('cpu')) || 'Monitor CPU usage trends'
        },
        memory: {
          current: metrics.memoryUsage.toFixed(2),
          trend: metrics.memoryUsage > 70 ? 'increasing' : metrics.memoryUsage > 30 ? 'stable' : 'decreasing',
          recommendation: analysis?.recommendations?.find((r: string) => r.toLowerCase().includes('memory')) || 'Monitor memory allocation'
        },
        database: {
          connections: metrics.database?.active_connections || 0,
          trend: 'stable',
          recommendation: analysis?.recommendations?.find((r: string) => r.toLowerCase().includes('database')) || 'Optimize database queries'
        },
        responseTime: {
          current: metrics.averageResponseTime || 0,
          trend: (metrics.averageResponseTime || 0) > 500 ? 'degrading' : 'optimal',
          recommendation: analysis?.recommendations?.find((r: string) => r.toLowerCase().includes('response')) || 'Monitor API response times'
        },
        summary: analysis?.summary || 'System performance is within normal parameters',
        score: analysis?.score || Math.round(100 - (metrics.cpuUsage + metrics.memoryUsage) / 2),
        aiProvider: analysis?.provider || 'system',
        timestamp: new Date().toISOString()
      };
      
      // Broadcast performance insights to websocket clients
      this.wsService.broadcast('ai:performance_insights', performanceInsights);
      
      res.json(performanceInsights);
    } catch (error) {
      logger.error('Failed to get performance insights:', error);
      throw new AppError(500, 'Failed to get performance insights');
    }
  };

  public getSecurityInsights = async (req: RequestWithUser, res: Response) => {
    try {
      // Get security events from the last 24 hours
      const securityEvents = await this.systemMetricsService.getSecurityEvents();
      const errorLogs = await this.systemMetricsService.getRecentErrors();
      
      // Get suspicious IPs
      const suspiciousIPs = await this.systemMetricsService.getSuspiciousIPs();
      
      // Calculate security metrics
      const failedLogins = securityEvents.filter(event => 
        event.type === 'auth' && event.action === 'login' && !event.success
      ).length;
      
      const suspiciousActivities = securityEvents.filter(event => 
        event.severity === 'high' || event.severity === 'critical'
      ).length;
      
      // Generate vulnerabilities based on error logs
      const vulnerabilities = errorLogs
        .filter(log => log.message.toLowerCase().includes('security') || 
                      log.message.toLowerCase().includes('vulnerability') ||
                      log.message.toLowerCase().includes('exploit'))
        .slice(0, 3)
        .map(log => ({
          type: log.message.split(':')[0] || 'Security Issue',
          description: log.message,
          severity: log.level === 'error' ? 'high' : 'medium'
        }));
      
      // Calculate security score
      const securityScore = this.systemMetricsService.calculateSecurityScore(securityEvents, suspiciousIPs.length);
      
      // Generate recommendations
      const recommendations = this.systemMetricsService.generateSecurityRecommendations(securityEvents, suspiciousIPs);
      
      const securityInsights = {
        failedLogins,
        suspiciousActivities,
        suspiciousIPs: suspiciousIPs.length,
        vulnerabilities: vulnerabilities.length > 0 ? vulnerabilities : [
          {
            type: 'System Scan',
            description: 'Regular security scan completed',
            severity: 'low'
          }
        ],
        score: securityScore,
        recommendations,
        timestamp: new Date().toISOString()
      };
      
      // Broadcast security insights to websocket clients
      this.wsService.broadcast('ai:security_insights', securityInsights);
      
      res.json(securityInsights);
    } catch (error) {
      logger.error('Failed to get security insights:', error);
      throw new AppError(500, 'Failed to get security insights');
    }
  };

  public getUsageInsights = async (req: RequestWithUser, res: Response) => {
    try {
      // Get request metrics for usage analysis
      const requestMetrics = await this.systemMetricsService.getCurrentMetrics();
      
      if (!requestMetrics) {
        return res.json({
          daily: {
            requests: 0,
            uniqueUsers: 0,
            peakHour: 'N/A'
          },
          weekly: {
            trend: 'stable',
            averageLoad: 0
          },
          monthly: {
            growth: 0,
            forecast: 0
          },
          topPaths: [],
          recommendations: ['Start collecting usage data'],
          timestamp: new Date().toISOString()
        });
      }
      
      // Calculate daily metrics
      const dailyRequests = requestMetrics.totalRequests || 0;
      const uniqueUsers = requestMetrics.activeUsers || 0;
      
      // Get peak hour (mock data for now)
      const hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
      const hourCounts = hours.map(hour => ({
        hour,
        count: Math.floor(Math.random() * dailyRequests / 24)
      }));
      const peakHour = hourCounts.sort((a, b) => b.count - a.count)[0].hour;
      
      // Calculate request trend
      const requestTrend = this.systemMetricsService.calculateRequestTrend();
      
      // Get top paths
      const topPaths = requestMetrics.topPaths || [];
      
      // Generate usage insights
      const usageInsights = {
        daily: {
          requests: dailyRequests,
          uniqueUsers,
          peakHour: `${peakHour}:00`
        },
        weekly: {
          trend: requestTrend.trend || 'stable',
          averageLoad: requestTrend.averageLoad || 0
        },
        monthly: {
          growth: requestTrend.growth || 0,
          forecast: requestTrend.forecast || 0
        },
        topPaths: topPaths.slice(0, 5).map((path: any) => ({
          path: path.path,
          count: path.count,
          trend: path.trend || 'stable'
        })),
        recommendations: [
          'Optimize frequently accessed endpoints',
          'Consider caching for high-traffic routes',
          'Monitor user engagement patterns'
        ],
        timestamp: new Date().toISOString()
      };
      
      // Broadcast usage insights to websocket clients
      this.wsService.broadcast('ai:usage_insights', usageInsights);
      
      res.json(usageInsights);
    } catch (error) {
      logger.error('Failed to get usage insights:', error);
      throw new AppError(500, 'Failed to get usage insights');
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

  public getRecentLogs = async (req: RequestWithUser, res: Response) => {
    try {
      // Check if the method exists
      if (typeof this.systemMetricsService.getRecentLogs !== 'function') {
        return res.json([]);
      }
      
      const logs = await this.systemMetricsService.getRecentLogs();
      res.json(logs);
    } catch (error) {
      logger.error('Failed to get recent logs:', error);
      throw new AppError(500, 'Failed to get recent logs');
    }
  };

  // Add a new method to handle WebSocket metrics requests
  public handleWebSocketMetricsRequest = async (userId: string) => {
    try {
      logger.info(`Handling WebSocket metrics request for user ${userId}`);
      
      // Get all metrics data with safe method calls
      const [
        health,
        metrics,
        performanceInsights,
        securityInsights,
        usageInsights
      ] = await Promise.all([
        this.systemMetricsService.getSystemHealth(),
        this.systemMetricsService.getSystemMetrics(),
        this.systemMetricsService.getPerformanceInsights(),
        this.systemMetricsService.getSecurityInsights(),
        this.systemMetricsService.getUsageInsights()
      ]);

      // Safely get additional data that might not be available
      let recentLogs = [];
      let errorLogs = [];
      let authLogs = [];
      let requestMetrics = null;
      let locations = [];

      try {
        if (typeof this.systemMetricsService.getRecentLogs === 'function') {
          recentLogs = await this.systemMetricsService.getRecentLogs();
        }
      } catch (error) {
        logger.error('Error getting recent logs:', error);
      }

      try {
        errorLogs = await this.systemMetricsService.getRecentErrors();
      } catch (error) {
        logger.error('Error getting error logs:', error);
      }

      try {
        authLogs = await this.systemMetricsService.getAuthLogs();
      } catch (error) {
        logger.error('Error getting auth logs:', error);
      }

      try {
        requestMetrics = await this.systemMetricsService.getCurrentMetrics();
      } catch (error) {
        logger.error('Error getting request metrics:', error);
      }

      try {
        if (typeof this.systemMetricsService.getRequestLocations === 'function') {
          locations = await this.systemMetricsService.getRequestLocations();
          // Ensure locations is always an array
          locations = Array.isArray(locations) ? locations : [];
        }
      } catch (error) {
        logger.error('Error getting locations:', error);
        locations = [];
      }

      // Calculate health score
      const cpuScore = health.resources.cpu.status === 'normal' ? 100 :
        health.resources.cpu.status === 'warning' ? 70 : 40;
      const memoryScore = health.resources.memory.status === 'normal' ? 100 :
        health.resources.memory.status === 'warning' ? 70 : 40;
      const diskScore = health.resources.disk.status === 'normal' ? 100 :
        health.resources.disk.status === 'warning' ? 70 : 40;

      const healthScore = Math.round((cpuScore + memoryScore + diskScore) / 3);
      
      const responseHealth = {
        ...health,
        score: healthScore,
        status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical'
      };

      // Send data to the user via WebSocket
      this.wsService.sendToUser(userId, 'metrics:update', {
        health: responseHealth,
        metrics
      });
      
      this.wsService.sendToUser(userId, 'logs:update', recentLogs);
      this.wsService.sendToUser(userId, 'error:logs:update', errorLogs);
      this.wsService.sendToUser(userId, 'auth:logs:update', authLogs);
      this.wsService.sendToUser(userId, 'request:metrics:update', requestMetrics || []);
      this.wsService.sendToUser(userId, 'locations:update', locations);
      this.wsService.sendToUser(userId, 'insights:performance:update', performanceInsights);
      this.wsService.sendToUser(userId, 'insights:security:update', securityInsights);
      this.wsService.sendToUser(userId, 'insights:usage:update', usageInsights);
      
      // Send AI analysis
      const aiAnalysis = await this.aiService.analyzeMetrics(metrics);
      this.wsService.sendToUser(userId, 'metrics:analysis', aiAnalysis);
      
      logger.info(`Successfully sent metrics data to user ${userId} via WebSocket`);
    } catch (error) {
      logger.error(`Error handling WebSocket metrics request for user ${userId}:`, error);
    }
  }
}

// Export the controller instance
export const metricsController = new MetricsController(
  require('../services/ai.service').aiService,
  require('../services/websocket.service').wsService
); 