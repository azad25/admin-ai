import { WebSocketService } from './websocket.service';
import { logger } from '../utils/logger';
import { AIMessage } from '@admin-ai/shared/src/types/ai';

export class AIAssistantService {
  private wsService: WebSocketService;

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
  }

  public async sendMessage(userId: string, message: string, metadata?: Record<string, any>) {
    try {
      const fullMessage: AIMessage = {
        id: crypto.randomUUID(),
        content: message,
        role: 'assistant',
        metadata: {
          type: 'notification',
          status: 'info',
          category: 'ai',
          source: {
            page: 'AI Assistant',
            controller: 'AIAssistantService',
            action: 'sendMessage',
            details: metadata
          },
          timestamp: Date.now().toString(),
          read: false
        }
      };

      this.wsService.sendToUser(userId, fullMessage);
      logger.info('AI message sent to user:', { userId, message });
    } catch (error) {
      logger.error('Failed to send AI message:', error);
      throw error;
    }
  }

  public async broadcast(message: string, metadata?: Record<string, any>) {
    try {
      const fullMessage: AIMessage = {
        id: crypto.randomUUID(),
        content: message,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'info',
          category: 'ai',
          source: {
            page: 'AI Assistant',
            controller: 'AIAssistantService',
            action: 'broadcast',
            details: metadata
          },
          timestamp: Date.now().toString(),
          read: false
        }
      };

      this.wsService.broadcast('ai_message', fullMessage);
      logger.info('AI message broadcasted:', { message });
    } catch (error) {
      logger.error('Failed to broadcast AI message:', error);
      throw error;
    }
  }

  public async sendNotification(userId: string, type: 'trivia' | 'movie' | 'health' | 'quote', content: string) {
    try {
      await this.sendMessage(userId, content, {
        type: 'notification',
        status: 'info',
        category: type
      });
      logger.info(`Sent ${type} notification to user ${userId}`);
    } catch (error) {
      logger.error(`Error sending ${type} notification:`, error);
      throw error;
    }
  }

  public async sendAnalysis(userId: string, content: string, category?: string) {
    try {
      await this.sendMessage(userId, content, {
        type: 'analysis',
        status: 'info',
        category
      });
      logger.info(`Sent analysis to user ${userId}`);
    } catch (error) {
      logger.error('Error sending analysis:', error);
      throw error;
    }
  }

  public async sendSuggestion(userId: string, content: string, category?: string) {
    try {
      await this.sendMessage(userId, content, {
        type: 'suggestion',
        status: 'info',
        category
      });
      logger.info(`Sent suggestion to user ${userId}`);
    } catch (error) {
      logger.error('Error sending suggestion:', error);
      throw error;
    }
  }
} 