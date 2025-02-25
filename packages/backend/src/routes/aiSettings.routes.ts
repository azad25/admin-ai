import { Router } from 'express';
import { aiSettingsController } from '../controllers/aiSettings.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware.requireAuth);

// Get all provider settings
router.get('/', aiSettingsController.getAllProviderSettings);

// Get settings for a specific provider
router.get('/:provider', aiSettingsController.getProviderSettings);

// Get decrypted API key for a provider
router.get('/:provider/key', aiSettingsController.getDecryptedApiKey);

// Save settings for a specific provider
router.put('/:provider', aiSettingsController.saveProviderSettings);

// Verify a provider's API key
router.post('/verify', aiSettingsController.verifyProvider);

// Delete settings for a specific provider
router.delete('/:provider', aiSettingsController.deleteProviderSettings);

export default router; 