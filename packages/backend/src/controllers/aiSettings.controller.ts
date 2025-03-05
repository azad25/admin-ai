import { Response } from 'express';
import { RequestWithUser } from '../types/express';
import { AISettingsService } from '../services/aiSettings.service';
import { LLMProvider } from '@admin-ai/shared/src/types/ai';
import { logger } from '../utils/logger';
import { WebSocketService } from '../services/websocket.service';
import { AppError } from '../utils/error';
import * as crypto from 'crypto';

// Initialize the service - use a variable to store the promise
const aiSettingsServicePromise = AISettingsService.getInstance();

// Helper function to get the service instance
const getService = async () => {
  return await aiSettingsServicePromise;
};

export const aiSettingsController = {
  async getProviderSettings(req: RequestWithUser, res: Response) {
    try {
      const { provider } = req.params;
      
      // Get the service instance
      const aiSettingsService = await getService();
      
      const settings = await aiSettingsService.getProviderSettings(
        req.user.id,
        provider as LLMProvider
      );

      // Send notification for successful settings retrieval
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
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
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      res.json(settings);
    } catch (error) {
      logger.error('Failed to get provider settings:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Failed to retrieve settings for ${req.params.provider} provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'system',
          source: {
            page: 'AI Settings',
            controller: 'AISettingsController',
            action: 'getProviderSettings',
            details: { provider: req.params.provider }
          },
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to get provider settings');
    }
  },

  async getDecryptedApiKey(req: RequestWithUser, res: Response) {
    try {
      const { provider } = req.params;
      
      // Get the service instance
      const aiSettingsService = await getService();
      
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

  async getAllProviderSettings(req: RequestWithUser, res: Response) {
    try {
      // Get the service instance
      const aiSettingsService = await getService();
      
      const settings = await aiSettingsService.getAllProviderSettings(req.user.id);

      // Send notification for successful settings retrieval
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
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
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      res.json(settings);
    } catch (error) {
      logger.error('Failed to get all provider settings:', error);

      // Send error notification if we have a user
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
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
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to get all provider settings' });
      }
    }
  },

  async saveProviderSettings(req: RequestWithUser, res: Response) {
    try {
      const { provider } = req.params;
      const { apiKey, selectedModel, isActive } = req.body;

      if (!apiKey) {
        return res.status(400).json({ error: 'API key is required' });
      }
      
      // Get the service instance
      const aiSettingsService = await getService();
      
      const settings = await aiSettingsService.saveProviderSettings(
        req.user.id,
        provider as LLMProvider,
        { apiKey, selectedModel, isActive }
      );

      // Send notification for successful settings save
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Saved settings for ${provider} provider`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'system',
          source: {
            page: 'AI Settings',
            controller: 'AISettingsController',
            action: 'saveProviderSettings',
            details: { provider }
          },
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      res.json(settings);
    } catch (error) {
      logger.error('Failed to save provider settings:', error);
      
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Failed to save settings for ${req.params.provider} provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'system',
          source: {
            page: 'AI Settings',
            controller: 'AISettingsController',
            action: 'saveProviderSettings',
            details: { provider: req.params.provider }
          },
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to save provider settings' });
      }
    }
  },

  async verifyProvider(req: RequestWithUser, res: Response) {
    try {
      const { provider, apiKey } = req.body;
      
      if (!provider) {
        return res.status(400).json({ error: 'Provider is required' });
      }
      
      if (!apiKey) {
        return res.status(400).json({ error: 'API key is required' });
      }

      // Get the service instance
      const aiSettingsService = await getService();
      
      const result = await aiSettingsService.verifyProvider(
        provider as LLMProvider,
        apiKey,
        req.user.id
      );

      // Send notification for successful verification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Verified ${provider} provider successfully`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'system',
          source: {
            page: 'AI Settings',
            controller: 'AISettingsController',
            action: 'verifyProvider',
            details: { provider }
          },
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to verify provider:', error);
      
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Failed to verify ${req.body.provider} provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'system',
          source: {
            page: 'AI Settings',
            controller: 'AISettingsController',
            action: 'verifyProvider',
            details: { provider: req.body.provider }
          },
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to verify provider' });
      }
    }
  },

  async deleteProviderSettings(req: RequestWithUser, res: Response) {
    try {
      const { provider } = req.params;
      
      // Get the service instance
      const aiSettingsService = await getService();
      
      await aiSettingsService.deleteProviderSettings(
        req.user.id,
        provider as LLMProvider
      );

      // Send notification for successful deletion
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Deleted settings for ${provider} provider`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'system',
          source: {
            page: 'AI Settings',
            controller: 'AISettingsController',
            action: 'deleteProviderSettings',
            details: { provider }
          },
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to delete provider settings:', error);
      
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Failed to delete settings for ${req.params.provider} provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'system',
          source: {
            page: 'AI Settings',
            controller: 'AISettingsController',
            action: 'deleteProviderSettings',
            details: { provider: req.params.provider }
          },
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete provider settings' });
      }
    }
  },

  async updateProviderSettings(req: RequestWithUser, res: Response) {
    try {
      const { provider } = req.params;
      const updates = req.body;
      
      // Get the service instance
      const aiSettingsService = await getService();
      
      await aiSettingsService.updateProviderSettings(
        req.user.id,
        provider as LLMProvider,
        updates
      );

      // Send notification for successful update
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
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
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to update provider settings:', error);
      
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Failed to update settings for ${req.params.provider} provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'system',
          source: {
            page: 'AI Settings',
            controller: 'AISettingsController',
            action: 'updateProviderSettings',
            details: { provider: req.params.provider }
          },
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update provider settings' });
      }
    }
  },

  async verifyProviderSettings(req: RequestWithUser, res: Response) {
    try {
      const { provider } = req.params;
      const { apiKey } = req.body;
      
      // Get the service instance
      const aiSettingsService = await getService();
      
      const verificationResult = await aiSettingsService.verifyProviderSettings(
        req.user.id,
        provider as LLMProvider,
        { apiKey }
      );

      // Send notification for successful verification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Verified settings for ${provider} provider`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'system',
          source: {
            page: 'AI Settings',
            controller: 'AISettingsController',
            action: 'verifyProviderSettings',
            details: { provider }
          },
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      res.json(verificationResult);
    } catch (error) {
      logger.error('Failed to verify provider settings:', error);
      
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Failed to verify settings for ${req.params.provider} provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'system',
          source: {
            page: 'AI Settings',
            controller: 'AISettingsController',
            action: 'verifyProviderSettings',
            details: { provider: req.params.provider }
          },
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to verify provider settings' });
      }
    }
  },

  async getAISettings(req: RequestWithUser, res: Response) {
    try {
      // Get the service instance
      const aiSettingsService = await getService();
      
      // Get all provider settings for the user
      const settings = await aiSettingsService.getAllProviderSettings(req.user.id);
      
      // Get additional AI settings if needed
      const aiSettings = {
        providers: settings,
        // Add any other AI-related settings here
      };

      // Send notification for successful settings retrieval
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: 'Retrieved AI settings',
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'system',
          source: {
            page: 'AI Settings',
            controller: 'AISettingsController',
            action: 'getAISettings'
          },
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      // Wrap the response in a settings property to match frontend expectations
      res.json({ settings: aiSettings });
    } catch (error) {
      logger.error('Failed to get AI settings:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Failed to retrieve AI settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'system',
          source: {
            page: 'AI Settings',
            controller: 'AISettingsController',
            action: 'getAISettings'
          },
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to get AI settings');
    }
  }
}; 