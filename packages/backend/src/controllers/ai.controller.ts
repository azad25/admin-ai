import { Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import { AppError } from '../middleware/errorHandler';
import { AppDataSource } from '../database';
import { CrudPage } from '../database/entities/CrudPage';
import { LLMProvider } from '@admin-ai/shared/src/types/ai';
import { logger } from '../utils/logger';
import { WebSocketService } from '../services/websocket.service';

const crudPageRepository = AppDataSource.getRepository(CrudPage);

export class AIController {
  private aiService: AIService;

  constructor(wsService: WebSocketService) {
    this.aiService = new AIService(wsService);
  }

  async generateSchema(req: Request, res: Response) {
    try {
      const { description } = req.body;

      if (!description) {
        throw new AppError(400, 'Description is required');
      }

      const schema = await this.aiService.generateSchema(description);

      // Send notification for successful schema generation
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Generated schema from description: "${description.substring(0, 50)}${description.length > 50 ? '...' : ''}"`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'ai',
          source: {
            page: 'AI Assistant',
            controller: 'AIController',
            action: 'generateSchema',
            details: { description }
          },
          timestamp: Date.now(),
          read: false
        }
      });

      res.json(schema);
    } catch (error) {
      logger.error('Failed to generate schema:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Failed to generate schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'ai',
          source: {
            page: 'AI Assistant',
            controller: 'AIController',
            action: 'generateSchema'
          },
          timestamp: Date.now(),
          read: false
        }
      });

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to generate schema');
    }
  }

  async generateCrudConfig(req: Request, res: Response) {
    try {
      const { schema } = req.body;

      if (!schema) {
        throw new AppError(400, 'Schema is required');
      }

      const config = await this.aiService.generateCrudConfig(schema);

      // Send notification for successful config generation
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Generated CRUD configuration for schema`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'ai',
          source: {
            page: 'AI Assistant',
            controller: 'AIController',
            action: 'generateCrudConfig',
            details: { schema }
          },
          timestamp: Date.now(),
          read: false
        }
      });

      res.json(config);
    } catch (error) {
      logger.error('Failed to generate CRUD config:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Failed to generate CRUD configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'ai',
          source: {
            page: 'AI Assistant',
            controller: 'AIController',
            action: 'generateCrudConfig'
          },
          timestamp: Date.now(),
          read: false
        }
      });

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to generate CRUD configuration');
    }
  }

  async analyzePageData(req: Request, res: Response) {
    const { pageId } = req.params;

    // Get the CRUD page
    const page = await crudPageRepository.findOne({
      where: { id: pageId, userId: req.user.id },
    });

    if (!page) {
      throw new AppError(404, 'CRUD page not found');
    }

    // Get the data from the dynamic endpoint
    // Note: You'll need to implement the actual data fetching logic
    const data: Record<string, unknown>[] = [];

    const analysis = await this.aiService.analyzeData(data);
    res.json(analysis);
  }

  async suggestDashboardWidgets(req: Request, res: Response) {
    const { pageId } = req.params;

    // Get the CRUD page
    const page = await crudPageRepository.findOne({
      where: { id: pageId, userId: req.user.id },
    });

    if (!page) {
      throw new AppError(404, 'CRUD page not found');
    }

    // Get the data from the dynamic endpoint
    // Note: You'll need to implement the actual data fetching logic
    const data: Record<string, unknown>[] = [];

    const suggestions = await this.aiService.generateDashboardSuggestions(data);
    res.json(suggestions);
  }

  async verifyProvider(req: Request, res: Response) {
    try {
      const { provider, apiKey } = req.body;
      
      if (!provider || !apiKey) {
        return res.status(400).json({ error: 'Provider and API key are required' });
      }

      const config = await this.aiService.verifyProvider(provider as LLMProvider, apiKey, req.user.id);
      return res.json(config);
    } catch (error) {
      console.error('Error verifying provider:', error);
      return res.status(500).json({ error: 'Failed to verify provider' });
    }
  }

  async sendMessage(req: Request, res: Response) {
    try {
      const { content, role } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      const message = await this.aiService.sendMessage(content, role);
      return res.json(message);
    } catch (error) {
      console.error('Error sending message:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }
  }

  async executeCommand(req: Request, res: Response) {
    try {
      const { command, args } = req.body;
      
      if (!command) {
        throw new AppError(400, 'Command is required');
      }

      const result = await this.aiService.executeCommand(command, args);

      // Send notification for successful command execution
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Executed command: ${command}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'ai',
          source: {
            page: 'AI Assistant',
            controller: 'AIController',
            action: 'executeCommand',
            details: { command, args }
          },
          timestamp: Date.now(),
          read: false
        }
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to execute command:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Failed to execute command: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'ai',
          source: {
            page: 'AI Assistant',
            controller: 'AIController',
            action: 'executeCommand'
          },
          timestamp: Date.now(),
          read: false
        }
      });

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to execute command');
    }
  }

  async getSystemStatus(req: Request, res: Response) {
    try {
      const status = await this.aiService.getSystemStatus();
      return res.json(status);
    } catch (error) {
      console.error('Error getting system status:', error);
      return res.status(500).json({ error: 'Failed to get system status' });
    }
  }

  async getSettings(req: Request, res: Response) {
    try {
      const settings = this.aiService.getSettings();

      // Send notification for successful settings retrieval
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: 'Retrieved AI settings',
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'ai',
          source: {
            page: 'AI Assistant',
            controller: 'AIController',
            action: 'getSettings'
          },
          timestamp: Date.now(),
          read: false
        }
      });

      res.json(settings);
    } catch (error) {
      logger.error('Failed to get settings:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Failed to retrieve AI settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'ai',
          source: {
            page: 'AI Assistant',
            controller: 'AIController',
            action: 'getSettings'
          },
          timestamp: Date.now(),
          read: false
        }
      });

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to get AI settings');
    }
  }

  async updateSettings(req: Request, res: Response) {
    try {
      const settings = req.body;
      this.aiService.updateSettings(settings);

      // Send notification for successful settings update
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: 'Updated AI settings',
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'ai',
          source: {
            page: 'AI Assistant',
            controller: 'AIController',
            action: 'updateSettings',
            details: { settings }
          },
          timestamp: Date.now(),
          read: false
        }
      });

      res.json(this.aiService.getSettings());
    } catch (error) {
      logger.error('Failed to update settings:', error);

      // Send error notification
      const wsService: WebSocketService = req.app.get('wsService');
      wsService.sendToUser(req.user.id, {
        id: crypto.randomUUID(),
        content: `Failed to update AI settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'ai',
          source: {
            page: 'AI Assistant',
            controller: 'AIController',
            action: 'updateSettings'
          },
          timestamp: Date.now(),
          read: false
        }
      });

      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to update AI settings');
    }
  }
}

// Export a function to create the controller with WebSocket service
export function createAIController(wsService: WebSocketService) {
  return new AIController(wsService);
} 