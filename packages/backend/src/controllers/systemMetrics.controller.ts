import { Request, Response } from 'express';
import { systemMetricsService } from '../services/systemMetrics.service';
import { WebSocketService } from '../services/websocket.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';
import type { WebSocketEvents } from '@admin-ai/shared/src/types/websocket';
import type { RequestWithUser } from '../types/express';
import type { AIMessageMetadata } from '@admin-ai/shared/src/types/ai';

export const systemMetricsController = {
  async getSystemHealth(req: Request & Partial<RequestWithUser>, res: Response) {
    try {
      const health = await systemMetricsService.getSystemHealth();

      // Send notification for system health status
      const wsService: WebSocketService = req.app.get('wsService');
      if (req.user?.id) {
        const notification: WebSocketEvents['admin:notification'] = {
          id: randomUUID(),
          type: 'system',
          message: `System Health Status: ${health.resources.cpu.status}`,
          timestamp: new Date().toISOString(),
          metadata: {
            status: health.resources.cpu.status === 'normal' ? 'success' : 'warning',
            category: 'system',
            source: {
              page: 'System Metrics',
              controller: 'SystemMetricsController',
              action: 'getSystemHealth',
              details: health
            }
          }
        };
        await wsService.sendToUser(req.user.id, 'admin:notification', notification);
      }

      res.json(health);
    } catch (error) {
      logger.error('Failed to get system health:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      if (req.user?.id) {
        const errorNotification: WebSocketEvents['admin:notification'] = {
          id: randomUUID(),
          type: 'error',
          message: `Failed to retrieve system health: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
          metadata: {
            category: 'system',
            source: {
              page: 'System Metrics',
              controller: 'SystemMetricsController',
              action: 'getSystemHealth'
            }
          }
        };
        await wsService.sendToUser(req.user.id, 'admin:notification', errorNotification);
      }

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to get system health');
    }
  },

  async getRecentLogs(req: Request & Partial<RequestWithUser>, res: Response) {
    try {
      const logs = await systemMetricsService.getRecentErrors();

      // Send notification for log retrieval
      const wsService: WebSocketService = req.app.get('wsService');
      if (req.user?.id) {
        const notification: WebSocketEvents['admin:notification'] = {
          id: randomUUID(),
          type: 'info',
          message: `Retrieved ${logs.length} recent system logs`,
          timestamp: new Date().toISOString(),
          metadata: {
            category: 'system',
            source: {
              page: 'System Metrics',
              controller: 'SystemMetricsController',
              action: 'getRecentLogs'
            }
          }
        };
        await wsService.sendToUser(req.user.id, 'admin:notification', notification);
      }

      res.json(logs);
    } catch (error) {
      logger.error('Failed to get recent logs:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      if (req.user?.id) {
        const errorNotification: WebSocketEvents['admin:notification'] = {
          id: randomUUID(),
          type: 'error',
          message: `Failed to retrieve recent logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
          metadata: {
            category: 'system',
            source: {
              page: 'System Metrics',
              controller: 'SystemMetricsController',
              action: 'getRecentLogs'
            }
          }
        };
        await wsService.sendToUser(req.user.id, 'admin:notification', errorNotification);
      }

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to get recent logs');
    }
  },

  async getErrorLogs(req: Request & Partial<RequestWithUser>, res: Response) {
    try {
      const errors = await systemMetricsService.getRecentErrors();

      // Send notification for error logs retrieval
      const wsService: WebSocketService = req.app.get('wsService');
      if (req.user?.id) {
        const notification: WebSocketEvents['ai:message'] = {
          id: randomUUID(),
          content: `Retrieved ${errors.length} error logs`,
          role: 'system',
          timestamp: new Date().toISOString(),
          metadata: {
            type: 'notification',
            status: 'success',
            category: 'system',
            source: {
              page: 'System Metrics',
              controller: 'SystemMetricsController',
              action: 'getErrorLogs'
            },
            timestamp: new Date().toISOString(),
            read: false
          }
        };
        await wsService.sendToUser(req.user.id, 'ai:message', notification);
      }

      res.json(errors);
    } catch (error) {
      logger.error('Failed to get error logs:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      if (req.user?.id) {
        const errorNotification: WebSocketEvents['ai:message'] = {
          id: randomUUID(),
          content: `Failed to retrieve error logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
          role: 'system',
          timestamp: new Date().toISOString(),
          metadata: {
            type: 'notification',
            status: 'error',
            category: 'system',
            source: {
              page: 'System Metrics',
              controller: 'SystemMetricsController',
              action: 'getErrorLogs'
            },
            timestamp: new Date().toISOString(),
            read: false
          }
        };
        await wsService.sendToUser(req.user.id, 'ai:message', errorNotification);
      }

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to get error logs');
    }
  },

  async getAuthLogs(req: Request & Partial<RequestWithUser>, res: Response) {
    try {
      const logs = await systemMetricsService.getAuthLogs();

      // Send notification for auth logs retrieval
      const wsService: WebSocketService = req.app.get('wsService');
      if (req.user?.id) {
        const notification: WebSocketEvents['ai:message'] = {
          id: randomUUID(),
          content: `Retrieved ${logs.length} authentication logs`,
          role: 'system',
          timestamp: new Date().toISOString(),
          metadata: {
            type: 'notification',
            status: 'success',
            category: 'system',
            source: {
              page: 'System Metrics',
              controller: 'SystemMetricsController',
              action: 'getAuthLogs'
            },
            timestamp: new Date().toISOString(),
            read: false
          }
        };
        await wsService.sendToUser(req.user.id, 'ai:message', notification);
      }

      res.json(logs);
    } catch (error) {
      logger.error('Failed to get auth logs:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      if (req.user?.id) {
        const errorNotification: WebSocketEvents['ai:message'] = {
          id: randomUUID(),
          content: `Failed to retrieve authentication logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
          role: 'system',
          timestamp: new Date().toISOString(),
          metadata: {
            type: 'notification',
            status: 'error',
            category: 'system',
            source: {
              page: 'System Metrics',
              controller: 'SystemMetricsController',
              action: 'getAuthLogs'
            },
            timestamp: new Date().toISOString(),
            read: false
          }
        };
        await wsService.sendToUser(req.user.id, 'ai:message', errorNotification);
      }

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to get auth logs');
    }
  },

  async getRequestMetrics(req: Request & Partial<RequestWithUser>, res: Response) {
    try {
      const metrics = await systemMetricsService.getCurrentMetrics();

      // Send notification for request metrics retrieval
      const wsService: WebSocketService = req.app.get('wsService');
      if (req.user?.id) {
        const notification: WebSocketEvents['ai:message'] = {
          id: randomUUID(),
          content: `Retrieved system request metrics`,
          role: 'system',
          timestamp: new Date().toISOString(),
          metadata: {
            type: 'notification',
            status: 'success',
            category: 'system',
            source: {
              page: 'System Metrics',
              controller: 'SystemMetricsController',
              action: 'getRequestMetrics',
              details: {
                totalRequests: metrics?.totalRequests || 0,
                cpuUsage: metrics?.cpuUsage || 0,
                memoryUsage: metrics?.memoryUsage || 0,
                errorCount: metrics?.errorCount || 0
              }
            },
            timestamp: new Date().toISOString(),
            read: false
          }
        };
        await wsService.sendToUser(req.user.id, 'ai:message', notification);
      }

      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get request metrics:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      if (req.user?.id) {
        const errorNotification: WebSocketEvents['ai:message'] = {
          id: randomUUID(),
          content: `Failed to retrieve request metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
          role: 'system',
          timestamp: new Date().toISOString(),
          metadata: {
            type: 'notification',
            status: 'error',
            category: 'system',
            source: {
              page: 'System Metrics',
              controller: 'SystemMetricsController',
              action: 'getRequestMetrics'
            },
            timestamp: new Date().toISOString(),
            read: false
          }
        };
        await wsService.sendToUser(req.user.id, 'ai:message', errorNotification);
      }

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to get request metrics');
    }
  },

  async getLocationHeatmap(req: Request & Partial<RequestWithUser>, res: Response) {
    try {
      const heatmapData = await systemMetricsService.getPerformanceInsights();

      // Send notification for heatmap data retrieval
      const wsService: WebSocketService = req.app.get('wsService');
      if (req.user?.id) {
        const notification: WebSocketEvents['ai:message'] = {
          id: randomUUID(),
          content: `Retrieved location heatmap data`,
          role: 'system',
          timestamp: new Date().toISOString(),
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
            timestamp: new Date().toISOString(),
            read: false
          }
        };
        await wsService.sendToUser(req.user.id, 'ai:message', notification);
      }

      res.json(heatmapData);
    } catch (error) {
      logger.error('Failed to get location heatmap:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      if (req.user?.id) {
        const errorNotification: WebSocketEvents['ai:message'] = {
          id: randomUUID(),
          content: `Failed to retrieve location heatmap: ${error instanceof Error ? error.message : 'Unknown error'}`,
          role: 'system',
          timestamp: new Date().toISOString(),
          metadata: {
            type: 'notification',
            status: 'error',
            category: 'system',
            source: {
              page: 'System Metrics',
              controller: 'SystemMetricsController',
              action: 'getLocationHeatmap'
            },
            timestamp: new Date().toISOString(),
            read: false
          }
        };
        await wsService.sendToUser(req.user.id, 'ai:message', errorNotification);
      }

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to get location heatmap');
    }
  }
}; 