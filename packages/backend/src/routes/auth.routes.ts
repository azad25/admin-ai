import { Router } from 'express';
import { WebSocketService } from '../services/websocket.service';
import { createAuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export function createAuthRoutes(wsService: WebSocketService) {
  const router = Router();
  const authController = createAuthController(wsService);

  // Public routes
  router.post('/register', asyncHandler(authController.register));
  router.post('/login', asyncHandler(authController.login));
  router.post('/forgot-password', asyncHandler(authController.requestPasswordReset));
  router.post('/reset-password', asyncHandler(authController.resetPassword));

  // Protected routes
  router.use(authMiddleware.requireAuth);
  router.get('/me', asyncHandler(authController.getCurrentUser));
  router.post('/change-password', asyncHandler(authController.changePassword));
  router.post('/logout', asyncHandler(authController.logout));

  return router;
} 