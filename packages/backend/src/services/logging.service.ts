import { logger } from '../utils/logger';
import { EventEmitter } from 'events';
import { WebSocketService } from './websocket.service';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

interface LogEntry {
  timestamp: string;
  level: string;
  category: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export class LoggingService extends EventEmitter {
  private static instance: LoggingService;
  private wsService: WebSocketService | null = null;
  private readonly logDir: string;
  private readonly maxLogAge = 30 * 24 * 60 * 60 * 1000; // 30 days

  private constructor() {
    super();
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
    this.setupLogCleanup();
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private setupLogCleanup(): void {
    // Clean old logs daily
    setInterval(() => {
      this.cleanOldLogs();
    }, 24 * 60 * 60 * 1000);
  }

  public setWebSocketService(wsService: WebSocketService): void {
    this.wsService = wsService;
  }

  public async logAIEvent(event: {
    type: string;
    userId?: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      category: 'ai',
      message: event.message,
      metadata: {
        ...event.metadata,
        type: event.type,
        userId: event.userId
      }
    };

    // Log to file
    logger.info(event.message, { category: 'ai', ...event.metadata });

    // Emit event for real-time monitoring
    this.emit('ai_event', logEntry);

    // Send to WebSocket if user-specific
    if (event.userId && this.wsService) {
      this.wsService.sendToUser(event.userId, 'activity:log', {
        type: 'activity',
        data: {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          level: 'info',
          message: event.message,
          metadata: {
            userId: event.userId,
            source: event.type,
            details: event.metadata
          }
        }
      });
    }
  }

  public async logError(error: Error, context?: {
    userId?: string;
    category?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      category: context?.category || 'system',
      message: error.message,
      metadata: {
        ...context?.metadata,
        stack: error.stack,
        userId: context?.userId
      }
    };

    // Log to file
    logger.error(error.message, {
      category: context?.category || 'system',
      stack: error.stack,
      ...context?.metadata
    });

    // Emit event for real-time monitoring
    this.emit('error', logEntry);

    // Send to WebSocket if user-specific
    if (context?.userId && this.wsService) {
      this.wsService.sendToUser(context.userId, 'error:log', {
        type: 'error',
        data: {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          level: 'error',
          message: error.message,
          metadata: {
            userId: context.userId,
            source: context.category,
            details: {
              stack: error.stack,
              ...context
            }
          }
        }
      });
    }
  }

  public async getRecentLogs(options: {
    category?: string;
    level?: string;
    userId?: string;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<LogEntry[]> {
    try {
      const logs: LogEntry[] = [];
      const files = await fs.promises.readdir(this.logDir);
      
      for (const file of files) {
        if (!file.endsWith('.log')) continue;
        
        const content = await fs.promises.readFile(
          path.join(this.logDir, file),
          'utf-8'
        );
        
        const entries = content
          .split('\n')
          .filter(Boolean)
          .map(line => JSON.parse(line))
          .filter((entry: LogEntry) => {
            if (options.category && entry.category !== options.category) return false;
            if (options.level && entry.level !== options.level) return false;
            if (options.userId && entry.metadata?.userId !== options.userId) return false;
            if (options.startDate && new Date(entry.timestamp) < options.startDate) return false;
            if (options.endDate && new Date(entry.timestamp) > options.endDate) return false;
            return true;
          });
        
        logs.push(...entries);
      }

      // Sort by timestamp descending and limit results
      return logs
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, options.limit || 100);
    } catch (error) {
      logger.error('Failed to get recent logs:', error);
      return [];
    }
  }

  private async cleanOldLogs(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.logDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const stats = await fs.promises.stat(filePath);

        if (now - stats.mtimeMs > this.maxLogAge) {
          await fs.promises.unlink(filePath);
          logger.info(`Deleted old log file: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Failed to clean old logs:', error);
    }
  }
}