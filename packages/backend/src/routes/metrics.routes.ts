import { Router, Request, Response, NextFunction } from 'express';
import { MetricsController } from '../controllers/metrics.controller';
import { WebSocketService } from '../services/websocket.service';
import { AIService } from '../services/ai.service';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware } from '../middleware/auth.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { RequestWithUser } from '../types/express';

// Helper function to wrap controller methods
const wrapController = (
  fn: (req: RequestWithUser, res: Response) => Promise<void | Response>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Since we're using authMiddleware.requireAuth, we can safely assert the request has a user
      await fn(req as RequestWithUser, res);
    } catch (error) {
      next(error);
    }
  };
};

export function createMetricsRoutes(wsService: WebSocketService) {
  const router = Router();
  const aiService = new AIService();
  const metricsController = new MetricsController(aiService, wsService);

  // All routes require authentication
  router.use(authMiddleware.requireAuth);

  // Health and system metrics with caching
  router.get('/health', 
    cacheMiddleware({ 
      ttl: 30,
      key: (req) => `metrics:health:${req.user?.id || 'anonymous'}`
    }),
    asyncHandler<RequestWithUser>(async (req, res) => {
      return metricsController.getSystemHealth(req, res);
    }, true)
  );

  router.get('/system', 
    cacheMiddleware({ 
      ttl: 60,
      key: (req) => `metrics:system:${req.user?.id || 'anonymous'}`
    }),
    asyncHandler<RequestWithUser>(async (req, res) => {
      return metricsController.getSystemMetrics(req, res);
    }, true)
  );

  router.get('/requests', 
    cacheMiddleware({ 
      ttl: 300,
      key: (req) => `metrics:requests:${req.query.from}:${req.query.to}:${req.user?.id || 'anonymous'}`
    }),
    asyncHandler<RequestWithUser>(async (req, res) => {
      return metricsController.getRequestMetrics(req, res);
    }, true)
  );

  router.get('/locations', 
    cacheMiddleware({ 
      ttl: 600,
      key: (req) => `metrics:locations:${req.query.period}:${req.user?.id || 'anonymous'}`
    }),
    asyncHandler<RequestWithUser>(async (req, res) => {
      return metricsController.getLocationHeatmap(req, res);
    }, true)
  );

  router.get('/ai', 
    cacheMiddleware({ 
      ttl: 120,
      key: (req) => `metrics:ai:${req.user?.id || 'anonymous'}`
    }),
    asyncHandler<RequestWithUser>(async (req, res) => {
      return metricsController.getAIMetrics(req, res);
    }, true)
  );

  // Insights routes with conditional caching
  router.get('/insights/performance', 
    cacheMiddleware({ 
      ttl: 300,
      condition: (req) => !req.query.realtime,
      key: (req) => `metrics:insights:performance:${req.user?.id || 'anonymous'}`
    }),
    asyncHandler<RequestWithUser>(async (req, res) => {
      return metricsController.getPerformanceInsights(req, res);
    }, true)
  );

  router.get('/insights/security', 
    cacheMiddleware({ 
      ttl: 300,
      key: (req) => `metrics:insights:security:${req.user?.id || 'anonymous'}`
    }),
    asyncHandler<RequestWithUser>(async (req, res) => {
      return metricsController.getSecurityInsights(req, res);
    }, true)
  );

  router.get('/insights/usage', 
    cacheMiddleware({ 
      ttl: 600,
      key: (req) => `metrics:insights:usage:${req.query.period}:${req.user?.id || 'anonymous'}`
    }),
    asyncHandler<RequestWithUser>(async (req, res) => {
      return metricsController.getUsageInsights(req, res);
    }, true)
  );

  // Logs routes with short-lived caching
  router.get('/logs/recent', 
    cacheMiddleware({ 
      ttl: 30,
      key: (req) => `metrics:logs:recent:${req.user?.id || 'anonymous'}`
    }),
    asyncHandler<RequestWithUser>(async (req, res) => {
      return metricsController.getRecentLogs(req, res);
    }, true)
  );

  router.get('/logs/errors', 
    cacheMiddleware({ 
      ttl: 60,
      key: (req) => `metrics:logs:errors:${req.query.severity}:${req.user?.id || 'anonymous'}`
    }),
    asyncHandler<RequestWithUser>(async (req, res) => {
      return metricsController.getRecentErrors(req, res);
    }, true)
  );

  router.get('/logs/auth', 
    cacheMiddleware({ 
      ttl: 120,
      key: (req) => `metrics:logs:auth:${req.query.type}:${req.user?.id || 'anonymous'}`
    }),
    asyncHandler<RequestWithUser>(async (req, res) => {
      return metricsController.getAuthLogs(req, res);
    }, true)
  );

  return router;
} 