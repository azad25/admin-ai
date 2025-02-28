import { Request, Response } from 'express';
import { AISettingsService } from '../services/aiSettings.service';
import { LLMProvider } from '@admin-ai/shared/src/types/ai';
import { logger } from '../utils/logger';
import { WebSocketService } from '../services/websocket.service';
import { AppError } from '../middleware/errorHandler';
import crypto from 'crypto';

const aiSettingsService = new AISettingsService();

export const aiSettingsController = {
  async getProviderSettings(req: Request, res: Response) {
    try {
      const { provider } = req.params;
      const settings = await aiSettingsService.getProviderSettings(
        req.user.id,
        provider as LLMProvider
      );

      // Send notification for successful settings retrieval
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Retrieved settings for ${provider} provider`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'system',
          source: {
            page: 'AI Settings',
            controller: 'AISettingsController',
            action: 'getProviderSettings',
            details: { provider }
          },
          timestamp: Date.now(),
          read: false
        }
      });

      res.json(settings);
    } catch (error) {
      logger.error('Failed to get provider settings:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Failed to retrieve ${req.params.provider} provider settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'system',
          source: {
            page: 'AI Settings',
            controller: 'AISettingsController',
            action: 'getProviderSettings'
          },
          timestamp: Date.now(),
          read: false
        }
      });

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to get provider settings');
    }
  },

  async getDecryptedApiKey(req: Request, res: Response) {
    try {
      const { provider } = req.params;
      const apiKey = await aiSettingsService.getDecryptedApiKey(
        req.user.id,
        provider as LLMProvider
      );
      
      if (!apiKey) {
        return res.status(404).json({ error: 'API key not found' });
      }

      res.json({ apiKey });
    } catch (error) {
      logger.error('Failed to get decrypted API key:', error);
      res.status(500).json({ error: 'Failed to get API key' });
    }
  },

  async getAllProviderSettings(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        throw new AppError(401, 'Authentication required');
      }

      const settings = await aiSettingsService.getAllProviderSettings(req.user.id);

      // Send notification for successful settings retrieval
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: 'Retrieved all provider settings',
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'system',
          source: {
            page: 'AI Settings',
            controller: 'AISettingsController',
            action: 'getAllProviderSettings'
          },
          timestamp: Date.now(),
          read: false
        }
      });

      res.json(settings);
    } catch (error) {
      logger.error('Failed to get all provider settings:', error);

      if (req.user?.id) {
        // Send error notification if we have a user
        const wsService: WebSocketService = req.app.get('wsService');
        wsService.sendToUser(req.user.id, {
          id: crypto.randomUUID(),
          content: `Failed to retrieve provider settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
          role: 'system',
          metadata: {
            type: 'notification',
            status: 'error',
            category: 'system',
            source: {
              page: 'AI Settings',
              controller: 'AISettingsController',
              action: 'getAllProviderSettings'
            },
            timestamp: Date.now(),
            read: false
          }
        });
      }

      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to get all provider settings' });
      }
    }
  },

  async saveProviderSettings(req: Request, res: Response) {
    try {
      const { provider } = req.params;
      const { apiKey, selectedModel, isActive } = req.body;

      if (!apiKey) {
        return res.status(400).json({ error: 'API key is required' });
      }

      const settings = await aiSettingsService.saveProviderSettings(
        req.user.id,
        provider as LLMProvider,
        { apiKey, selectedModel, isActive }
      );

      res.json(settings);
    } catch (error) {
      logger.error('Failed to save provider settings:', error);
      res.status(500).json({ error: 'Failed to save provider settings' });
    }
  },

  async verifyProvider(req: Request, res: Response) {
    try {
      const { provider } = req.body;
      
      if (!provider) {
        return res.status(400).json({ error: 'Provider is required' });
      }

      const result = await aiSettingsService.verifyProvider(
        req.user.id,
        provider as LLMProvider
      );
      res.json(result);
    } catch (error) {
      logger.error('Failed to verify provider:', error);
      res.status(500).json({ error: 'Failed to verify provider' });
    }
  },

  async deleteProviderSettings(req: Request, res: Response) {
    try {
      const { provider } = req.params;
      await aiSettingsService.deleteProviderSettings(
        req.user.id,
        provider as LLMProvider
      );
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete provider settings:', error);
      res.status(500).json({ error: 'Failed to delete provider settings' });
    }
  },

  async updateProviderSettings(req: Request, res: Response) {
    try {
      const { provider } = req.params;
      const settings = req.body;
      
      await aiSettingsService.updateProviderSettings(
        req.user.id,
        provider as LLMProvider,
        settings
      );

      // Send notification for successful settings update
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Updated settings for ${provider} provider`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'system',
          source: {
            page: 'AI Settings',
            controller: 'AISettingsController',
            action: 'updateProviderSettings',
            details: { provider }
          },
          timestamp: Date.now(),
          read: false
        }
      });

      res.json({ message: 'Settings updated successfully' });
    } catch (error) {
      logger.error('Failed to update provider settings:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Failed to update ${req.params.provider} provider settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'system',
          source: {
            page: 'AI Settings',
            controller: 'AISettingsController',
            action: 'updateProviderSettings'
          },
          timestamp: Date.now(),
          read: false
        }
      });

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to update provider settings');
    }
  },

  async verifyProviderSettings(req: Request, res: Response) {
    try {
      const { provider } = req.params;
      const settings = req.body;
      
      const verificationResult = await aiSettingsService.verifyProviderSettings(
        req.user.id,
        provider as LLMProvider,
        settings
      );

      // Send notification based on verification result
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: verificationResult.success 
          ? `Successfully verified ${provider} provider settings`
          : `Failed to verify ${provider} provider settings: ${verificationResult.error}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: verificationResult.success ? 'success' : 'error',
          category: 'system',
          source: {
            page: 'AI Settings',
            controller: 'AISettingsController',
            action: 'verifyProviderSettings',
            details: { provider }
          },
          timestamp: Date.now(),
          read: false
        }
      });

      res.json(verificationResult);
    } catch (error) {
      logger.error('Failed to verify provider settings:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Failed to verify ${req.params.provider} provider settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'system',
          source: {
            page: 'AI Settings',
            controller: 'AISettingsController',
            action: 'verifyProviderSettings'
          },
          timestamp: Date.now(),
          read: false
        }
      });

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to verify provider settings');
    }
  }
}; 