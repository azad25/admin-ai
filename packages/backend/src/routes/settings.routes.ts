import { Router } from 'express';
import { aiSettingsController } from '../controllers/aiSettings.controller';
import { WebSocketService } from '../services/websocket.service';
import { asyncHandler } from '../utils/asyncHandler';

export function createSettingsRoutes(wsService: WebSocketService) {
  const router = Router();

  // AI settings route
  router.get('/ai', asyncHandler(aiSettingsController.getAISettings));

  // Provider settings routes
  router.get('/providers/:provider', asyncHandler(aiSettingsController.getProviderSettings));
  router.get('/providers/:provider/key', asyncHandler(aiSettingsController.getDecryptedApiKey));
  router.get('/providers', asyncHandler(aiSettingsController.getAllProviderSettings));
  router.post('/providers/:provider', asyncHandler(aiSettingsController.saveProviderSettings));
  router.put('/providers/:provider', asyncHandler(aiSettingsController.updateProviderSettings));
  router.delete('/providers/:provider', asyncHandler(aiSettingsController.deleteProviderSettings));
  router.post('/providers/:provider/verify', asyncHandler(aiSettingsController.verifyProviderSettings));

  return router;
} 