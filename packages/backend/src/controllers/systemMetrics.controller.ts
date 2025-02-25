import { Request, Response } from 'express';
import { systemMetricsService } from '../services/systemMetrics.service';
import { WebSocketService } from '../services/websocket.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export const systemMetricsController = {
  async getSystemHealth(req: Request, res: Response) {
    try {
      const health = await systemMetricsService.getSystemHealth();

      // Send notification for system health status
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `System Health Status: ${health.status}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: health.status === 'healthy' ? 'success' : 'warning',
          category: 'system',
          source: {
            page: 'System Metrics',
            controller: 'SystemMetricsController',
            action: 'getSystemHealth',
            details: health
          },
          timestamp: Date.now(),
          read: false,
          priority: health.status === 'healthy' ? 'low' : 'high'
        }
      });

      res.json(health);
    } catch (error) {
      logger.error('Failed to get system health:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Failed to retrieve system health: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'system',
          source: {
            page: 'System Metrics',
            controller: 'SystemMetricsController',
            action: 'getSystemHealth'
          },
          timestamp: Date.now(),
          read: false,
          priority: 'high'
        }
      });

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to get system health');
    }
  },

  async getRecentLogs(req: Request, res: Response) {
    try {
      const logs = await systemMetricsService.getRecentLogs();

      // Send notification for log retrieval
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Retrieved ${logs.length} recent system logs`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'system',
          source: {
            page: 'System Metrics',
            controller: 'SystemMetricsController',
            action: 'getRecentLogs'
          },
          timestamp: Date.now(),
          read: false
        }
      });

      res.json(logs);
    } catch (error) {
      logger.error('Failed to get recent logs:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Failed to retrieve recent logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'system',
          source: {
            page: 'System Metrics',
            controller: 'SystemMetricsController',
            action: 'getRecentLogs'
          },
          timestamp: Date.now(),
          read: false
        }
      });

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to get recent logs');
    }
  },

  async getErrorLogs(req: Request, res: Response) {
    try {
      const errors = await systemMetricsService.getRecentErrors();

      // Send notification for error logs retrieval
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Retrieved ${errors.length} error logs`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'system',
          source: {
            page: 'System Metrics',
            controller: 'SystemMetricsController',
            action: 'getErrorLogs'
          },
          timestamp: Date.now(),
          read: false
        }
      });

      res.json(errors);
    } catch (error) {
      logger.error('Failed to get error logs:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Failed to retrieve error logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'system',
          source: {
            page: 'System Metrics',
            controller: 'SystemMetricsController',
            action: 'getErrorLogs'
          },
          timestamp: Date.now(),
          read: false
        }
      });

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to get error logs');
    }
  },

  async getAuthLogs(req: Request, res: Response) {
    try {
      const logs = await systemMetricsService.getAuthLogs();

      // Send notification for auth logs retrieval
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Retrieved ${logs.length} authentication logs`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'system',
          source: {
            page: 'System Metrics',
            controller: 'SystemMetricsController',
            action: 'getAuthLogs'
          },
          timestamp: Date.now(),
          read: false
        }
      });

      res.json(logs);
    } catch (error) {
      logger.error('Failed to get auth logs:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Failed to retrieve authentication logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'system',
          source: {
            page: 'System Metrics',
            controller: 'SystemMetricsController',
            action: 'getAuthLogs'
          },
          timestamp: Date.now(),
          read: false
        }
      });

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to get auth logs');
    }
  },

  async getRequestMetrics(req: Request, res: Response) {
    try {
      const metrics = await systemMetricsService.getRequestMetrics();

      // Send notification for request metrics retrieval
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Retrieved system request metrics`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'system',
          source: {
            page: 'System Metrics',
            controller: 'SystemMetricsController',
            action: 'getRequestMetrics',
            details: {
              requestCount: metrics.total || 0,
              averageResponseTime: metrics.averageResponseTime || 0
            }
          },
          timestamp: Date.now(),
          read: false
        }
      });

      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get request metrics:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Failed to retrieve request metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'system',
          source: {
            page: 'System Metrics',
            controller: 'SystemMetricsController',
            action: 'getRequestMetrics'
          },
          timestamp: Date.now(),
          read: false
        }
      });

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to get request metrics');
    }
  },

  async getLocationHeatmap(req: Request, res: Response) {
    try {
      const heatmapData = await systemMetricsService.getLocationHeatmap();

      // Send notification for heatmap data retrieval
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Retrieved location heatmap data`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'system',
          source: {
            page: 'System Metrics',
            controller: 'SystemMetricsController',
            action: 'getLocationHeatmap',
            details: { dataPoints: Object.keys(heatmapData).length }
          },
          timestamp: Date.now(),
          read: false
        }
      });

      res.json(heatmapData);
    } catch (error) {
      logger.error('Failed to get location heatmap:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Failed to retrieve location heatmap: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'system',
          source: {
            page: 'System Metrics',
            controller: 'SystemMetricsController',
            action: 'getLocationHeatmap'
          },
          timestamp: Date.now(),
          read: false
        }
      });

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to get location heatmap');
    }
  }
}; 