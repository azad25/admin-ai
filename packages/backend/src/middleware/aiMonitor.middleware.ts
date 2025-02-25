import { Request, Response, NextFunction } from 'express';
import { AIService } from '../services/ai.service';
import { WebSocketService } from '../services/websocket.service';
import { logger } from '../utils/logger';

export class AIMonitorMiddleware {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  public handle = async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;
    const aiService = this.aiService;

    try {
      // Log incoming request
      await this.aiService.handleSystemEvent({
        type: 'request',
        content: `Incoming ${req.method} request to ${req.path}`,
        status: 'info',
        category: 'system',
        source: {
          page: req.path,
          controller: 'System',
          action: 'request',
          details: {
            method: req.method,
            path: req.path,
            query: req.query,
            body: req.body,
            ip: req.ip
          }
        }
      }, req.user?.id);

      // Override response methods to intercept the response
      res.send = function (body: any): Response {
        const duration = Date.now() - startTime;
        const status = res.statusCode;
        
        aiService.handleSystemEvent({
          type: 'response',
          content: `Request completed in ${duration}ms with status ${status}`,
          status: status >= 400 ? 'error' : 'success',
          category: 'system',
          source: {
            page: req.path,
            controller: 'System',
            action: 'response',
            details: {
              duration,
              status,
              body
            }
          }
        }, req.user?.id).catch((err: Error) => logger.error('Failed to handle response event:', err));

        return originalSend.call(res, body);
      };

      res.json = function (body: any): Response {
        const duration = Date.now() - startTime;
        const status = res.statusCode;

        aiService.handleSystemEvent({
          type: 'response',
          content: `Request completed in ${duration}ms with status ${status}`,
          status: status >= 400 ? 'error' : 'success',
          category: 'system',
          source: {
            page: req.path,
            controller: 'System',
            action: 'response',
            details: {
              duration,
              status,
              body
            }
          }
        }, req.user?.id).catch((err: Error) => logger.error('Failed to handle response event:', err));

        return originalJson.call(res, body);
      };

      // Override end method with proper overloads
      const endHandler = function(this: Response, chunk?: any, encoding?: BufferEncoding | (() => void), callback?: () => void): Response {
        const duration = Date.now() - startTime;
        const status = res.statusCode;

        aiService.handleSystemEvent({
          type: 'response',
          content: `Request completed in ${duration}ms with status ${status}`,
          status: status >= 400 ? 'error' : 'success',
          category: 'system',
          source: {
            page: req.path,
            controller: 'System',
            action: 'response',
            details: {
              duration,
              status
            }
          }
        }, req.user?.id).catch((err: Error) => logger.error('Failed to handle response event:', err));

        // Handle different overloads
        if (typeof encoding === 'function') {
          return originalEnd.call(this, chunk, 'utf8' as BufferEncoding, encoding);
        }
        return originalEnd.call(this, chunk, (encoding as BufferEncoding) || 'utf8', callback);
      };

      res.end = endHandler;

      next();
    } catch (error) {
      logger.error('Error in AI monitor middleware:', error);
      next(error);
    }
  };

  public handleError = async (error: Error, req: Request, res: Response, next: NextFunction) => {
    try {
      await this.aiService.handleSystemEvent({
        type: 'error',
        content: `Error occurred: ${error.message}`,
        status: 'error',
        category: 'system',
        source: {
          page: req.path,
          controller: 'System',
          action: 'error',
          details: {
            error: error.message,
            stack: error.stack
          }
        }
      }, req.user?.id);
    } catch (err) {
      logger.error('Failed to handle error event:', err);
    }
    next(error);
  };
} 