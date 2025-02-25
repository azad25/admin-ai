import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

interface ErrorLog {
  timestamp: Date;
  type: string;
  message: string;
  stack?: string;
  metadata?: Record<string, any>;
}

export class ErrorMonitor extends EventEmitter {
  private static readonly MAX_ERROR_LOGS = 1000;
  private errorLogs: ErrorLog[] = [];
  private isMonitoring: boolean = false;

  constructor() {
    super();
    this.setupGlobalErrorHandlers();
  }

  public async start(): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    logger.info('Error monitoring started');
  }

  public async stop(): Promise<void> {
    this.isMonitoring = false;
    logger.info('Error monitoring stopped');
  }

  private setupGlobalErrorHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      this.handleError('uncaught_exception', error);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any) => {
      this.handleError('unhandled_rejection', reason);
    });

    // Handle system warnings
    process.on('warning', (warning: Error) => {
      this.handleError('system_warning', warning);
    });
  }

  public handleError(type: string, error: Error | any, metadata?: Record<string, any>): void {
    if (!this.isMonitoring) {
      return;
    }

    const errorLog: ErrorLog = {
      timestamp: new Date(),
      type,
      message: error.message || String(error),
      stack: error.stack,
      metadata
    };

    // Add to error logs with size limit
    this.errorLogs.push(errorLog);
    if (this.errorLogs.length > ErrorMonitor.MAX_ERROR_LOGS) {
      this.errorLogs.shift();
    }

    // Log the error
    logger.error(`${type}: ${errorLog.message}`, {
      stack: errorLog.stack,
      metadata: errorLog.metadata
    });

    // Emit error event
    this.emit('error_detected', errorLog);

    // Check for critical errors
    if (this.isCriticalError(type, error)) {
      this.handleCriticalError(errorLog);
    }
  }

  private isCriticalError(type: string, error: any): boolean {
    // Define conditions for critical errors
    const criticalConditions = [
      type === 'uncaught_exception',
      error.fatal === true,
      error.code === 'ECONNREFUSED',
      error.code === 'ETIMEDOUT',
      error.message?.includes('OutOfMemory'),
      error.message?.includes('Database connection lost')
    ];

    return criticalConditions.some(condition => condition);
  }

  private handleCriticalError(errorLog: ErrorLog): void {
    logger.error('Critical error detected', errorLog);
    this.emit('critical_error', errorLog);

    // Implement recovery strategies
    this.attemptRecovery(errorLog);
  }

  private async attemptRecovery(errorLog: ErrorLog): Promise<void> {
    try {
      logger.info('Attempting system recovery', { error: errorLog });

      // Implement different recovery strategies based on error type
      switch (errorLog.type) {
        case 'database_error':
          // Attempt database reconnection
          this.emit('recovery_action', 'database_reconnect');
          break;

        case 'memory_error':
          // Attempt garbage collection
          if (global.gc) {
            global.gc();
          }
          break;

        case 'service_error':
          // Attempt service restart
          this.emit('recovery_action', 'service_restart');
          break;

        default:
          // Default recovery action
          this.emit('recovery_action', 'default');
      }

      logger.info('Recovery attempt completed');
    } catch (error) {
      logger.error('Recovery attempt failed', { error });
      this.emit('recovery_failed', { originalError: errorLog, recoveryError: error });
    }
  }

  public getErrorLogs(): ErrorLog[] {
    return [...this.errorLogs];
  }

  public clearErrorLogs(): void {
    this.errorLogs = [];
    logger.info('Error logs cleared');
  }
} 