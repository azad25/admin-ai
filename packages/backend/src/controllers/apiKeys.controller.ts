import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { AppDataSource } from '../database';
import { ApiKey } from '../database/entities/ApiKey';
import { AppError } from '../middleware/errorHandler';
import { systemMetricsService } from '../services/systemMetrics.service';
import { WebSocketService } from '../services/websocket.service';
import { RequestWithUser } from '../types/express';
import crypto from 'crypto';

const apiKeyRepository = AppDataSource.getRepository(ApiKey);

export const apiKeysController = {
  async getAll(req: RequestWithUser, res: Response) {
    try {
      const apiKeys = await apiKeyRepository.find({
        where: { userId: req.user.id },
        order: { createdAt: 'DESC' },
      });

      // Send notification for successful fetch
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Successfully retrieved ${apiKeys.length} API keys`,
        role: 'system',
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'api',
          source: {
            page: 'API Keys',
            controller: 'ApiKeysController',
            action: 'getAll'
          },
          timestamp: new Date().toISOString(),
          read: false
        }
      });

      res.json(apiKeys);
    } catch (error) {
      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Failed to retrieve API keys: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'api',
          source: {
            page: 'API Keys',
            controller: 'ApiKeysController',
            action: 'getAll'
          },
          timestamp: new Date().toISOString(),
          read: false
        }
      });

      throw error;
    }
  },

  async create(req: RequestWithUser, res: Response) {
    try {
      const { name, expiresAt, permissions } = req.body;

      if (!name) {
        throw new AppError(400, 'Name is required');
      }

      const key = randomBytes(32).toString('hex');
      const apiKey = await apiKeyRepository.save({
        name,
        key,
        userId: req.user.id,
        expiresAt,
        permissions,
      });

      // Send notification for successful creation
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Successfully created API key: ${apiKey.name}`,
        role: 'system',
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'api',
          source: {
            page: 'API Keys',
            controller: 'ApiKeysController',
            action: 'create',
            details: { name }
          },
          timestamp: new Date().toISOString(),
          read: false
        }
      });

      res.status(201).json(apiKey);
    } catch (error) {
      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Failed to create API key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'api',
          source: {
            page: 'API Keys',
            controller: 'ApiKeysController',
            action: 'create'
          },
          timestamp: new Date().toISOString(),
          read: false
        }
      });

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to create API key');
    }
  },

  async update(req: RequestWithUser, res: Response) {
    try {
      const { id } = req.params;
      const { name, expiresAt, permissions, isActive } = req.body;

      if (!name) {
        throw new AppError(400, 'Name is required');
      }

      const apiKey = await apiKeyRepository.findOne({
        where: { id, userId: req.user.id },
      });

      if (!apiKey) {
        throw new AppError(404, 'API key not found');
      }

      apiKey.name = name;
      apiKey.expiresAt = expiresAt;
      apiKey.permissions = permissions;
      apiKey.isActive = isActive;
      await apiKeyRepository.save(apiKey);

      // Send notification for successful update
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Successfully updated API key: ${apiKey.name}`,
        role: 'system',
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'api',
          source: {
            page: 'API Keys',
            controller: 'ApiKeysController',
            action: 'update',
            details: { name }
          },
          timestamp: new Date().toISOString(),
          read: false
        }
      });

      res.json(apiKey);
    } catch (error) {
      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Failed to update API key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'api',
          source: {
            page: 'API Keys',
            controller: 'ApiKeysController',
            action: 'update'
          },
          timestamp: new Date().toISOString(),
          read: false
        }
      });

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to update API key');
    }
  },

  async delete(req: RequestWithUser, res: Response) {
    try {
      const { id } = req.params;

      const apiKey = await apiKeyRepository.findOne({
        where: { id, userId: req.user.id },
      });

      if (!apiKey) {
        throw new AppError(404, 'API key not found');
      }

      await apiKeyRepository.remove(apiKey);

      // Send notification for successful deletion
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Successfully deleted API key: ${apiKey.name}`,
        role: 'system',
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'api',
          source: {
            page: 'API Keys',
            controller: 'ApiKeysController',
            action: 'delete',
            details: { name: apiKey.name }
          },
          timestamp: new Date().toISOString(),
          read: false
        }
      });

      res.status(204).send();
    } catch (error) {
      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Failed to delete API key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'api',
          source: {
            page: 'API Keys',
            controller: 'ApiKeysController',
            action: 'delete'
          },
          timestamp: new Date().toISOString(),
          read: false
        }
      });

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to delete API key');
    }
  },

  async regenerate(req: RequestWithUser, res: Response) {
    const { id } = req.params;

    const apiKey = await apiKeyRepository.findOne({
      where: { id, userId: req.user.id },
    });

    if (!apiKey) {
      throw new AppError(404, 'API key not found');
    }

    // Generate a new API key
    apiKey.key = `ak_${randomBytes(32).toString('hex')}`;

    await apiKeyRepository.save(apiKey);

    res.json(apiKey);
  },

  async validateKey(key: string, req?: Request): Promise<ApiKey> {
    const apiKey = await apiKeyRepository.findOne({
      where: { key },
      relations: ['user'],
    });

    if (!apiKey) {
      throw new AppError(401, 'Invalid API key');
    }

    // Update last used timestamp
    apiKey.lastUsed = new Date();
    await apiKeyRepository.save(apiKey);

    // Log API key usage if request object is available
    if (req) {
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
                 req.socket.remoteAddress || 
                 'unknown';

      systemMetricsService.logRequest({
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        statusCode: 200,
        duration: 0,
        ip,
        location: req.location // This will be set by the requestTracker middleware
      });
    }

    return apiKey;
  },
}; 