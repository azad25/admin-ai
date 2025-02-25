import { Router } from 'express';
import { createAIController } from '../controllers/ai.controller';
import { WebSocketService } from '../services/websocket.service';
import { asyncHandler } from '../utils/asyncHandler';

export function createAIRoutes(wsService: WebSocketService) {
  const router = Router();
  const aiController = createAIController(wsService);

  // AI routes
  router.post('/schema/generate', asyncHandler(aiController.generateSchema.bind(aiController)));
  router.post('/crud/generate', asyncHandler(aiController.generateCrudConfig.bind(aiController)));
  router.post('/analyze', asyncHandler(aiController.analyzePageData.bind(aiController)));
  router.post('/dashboard/suggest', asyncHandler(aiController.suggestDashboardWidgets.bind(aiController)));
  router.post('/provider/verify', asyncHandler(aiController.verifyProvider.bind(aiController)));
  router.post('/message', asyncHandler(aiController.sendMessage.bind(aiController)));
  router.post('/command', asyncHandler(aiController.executeCommand.bind(aiController)));
  router.get('/status', asyncHandler(aiController.getSystemStatus.bind(aiController)));
  router.get('/settings', asyncHandler(aiController.getSettings.bind(aiController)));
  router.put('/settings', asyncHandler(aiController.updateSettings.bind(aiController)));

  return router;
} 