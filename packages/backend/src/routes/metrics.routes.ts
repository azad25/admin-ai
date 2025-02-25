import { Router } from 'express';
import { MetricsController } from '../controllers/metrics.controller';
import { WebSocketService } from '../services/websocket.service';
import { AIService } from '../services/ai.service';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware } from '../middleware/auth.middleware';

export function createMetricsRoutes(wsService: WebSocketService) {
  const router = Router();
  const aiService = new AIService(wsService);
  const metricsController = new MetricsController(aiService, wsService);

  // All routes require authentication
  router.use(authMiddleware.requireAuth);

  // Health and system metrics
  router.get('/health', asyncHandler(metricsController.getSystemHealth));
  router.get('/system', asyncHandler(metricsController.getSystemMetrics));
  router.get('/requests', asyncHandler(metricsController.getRequestMetrics));
  router.get('/locations', asyncHandler(metricsController.getLocationHeatmap));
  router.get('/ai', asyncHandler(metricsController.getAIMetrics));

  // Insights routes
  router.get('/insights/performance', asyncHandler(metricsController.getPerformanceInsights));
  router.get('/insights/security', asyncHandler(metricsController.getSecurityInsights));
  router.get('/insights/usage', asyncHandler(metricsController.getUsageInsights));

  // Logs routes
  router.get('/logs/recent', asyncHandler(metricsController.getRecentLogs));
  router.get('/logs/errors', asyncHandler(metricsController.getRecentErrors));
  router.get('/logs/auth', asyncHandler(metricsController.getAuthLogs));

  return router;
} 