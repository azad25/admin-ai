import { Router } from 'express';
import { apiKeysController } from '../controllers/apiKeys.controller';
import { WebSocketService } from '../services/websocket.service';
import { asyncHandler } from '../utils/asyncHandler';

export function createApiKeysRoutes(wsService: WebSocketService) {
  const router = Router();

  // API key routes
  router.get('/', asyncHandler(apiKeysController.getAll));
  router.post('/', asyncHandler(apiKeysController.create));
  router.put('/:id', asyncHandler(apiKeysController.update));
  router.delete('/:id', asyncHandler(apiKeysController.delete));
  router.post('/:id/regenerate', asyncHandler(apiKeysController.regenerate));

  return router;
} 