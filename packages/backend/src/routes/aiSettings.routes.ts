import { Router } from 'express';
import { RequestWithUser } from '../types/express';
import { aiSettingsController } from '../controllers/aiSettings.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware.requireAuth);

// Get all provider settings
router.get('/', (req, res, next) => {
  aiSettingsController.getAllProviderSettings(req as RequestWithUser, res).catch(next);
});

// Get settings for a specific provider
router.get('/:provider', (req, res, next) => {
  aiSettingsController.getProviderSettings(req as RequestWithUser, res).catch(next);
});

// Get decrypted API key for a provider
router.get('/:provider/key', (req, res, next) => {
  aiSettingsController.getDecryptedApiKey(req as RequestWithUser, res).catch(next);
});

// Save settings for a specific provider
router.put('/:provider', (req, res, next) => {
  aiSettingsController.saveProviderSettings(req as RequestWithUser, res).catch(next);
});

// Verify a provider's API key
router.post('/verify', (req, res, next) => {
  aiSettingsController.verifyProvider(req as RequestWithUser, res).catch(next);
});

// Delete settings for a specific provider
router.delete('/:provider', (req, res, next) => {
  aiSettingsController.deleteProviderSettings(req as RequestWithUser, res).catch(next);
});

// Verify provider settings
router.post('/:provider/verify', (req, res, next) => {
  aiSettingsController.verifyProviderSettings(req as RequestWithUser, res).catch(next);
});

// Update provider settings
router.patch('/:provider', (req, res, next) => {
  aiSettingsController.updateProviderSettings(req as RequestWithUser, res).catch(next);
});

export default router; 