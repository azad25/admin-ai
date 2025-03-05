import { EventEmitter } from 'events';

interface ErrorLog {
  timestamp: Date;
  type: string;
  message: string;
  stack?: string;
  metadata?: Record<string, any>;
}

export class ErrorMonitor extends EventEmitter {
  private static readonly MAX_ERROR_LOGS = 100;
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
    console.info('Frontend error monitoring started');
  }

  public async stop(): Promise<void> {
    this.isMonitoring = false;
    console.info('Frontend error monitoring stopped');
  }

  private setupGlobalErrorHandlers(): void {
    // Handle uncaught errors
    window.onerror = (message, source, lineno, colno, error) => {
      this.handleError('uncaught_error', error || message, {
        source,
        line: lineno,
        column: colno
      });
      return false;
    };

    // Handle unhandled promise rejections
    window.onunhandledrejection = (event) => {
      this.handleError('unhandled_rejection', event.reason);
    };

    // Handle React error boundary errors
    window.addEventListener('error', (event) => {
      if (event.error?.name === 'React Error Boundary') {
        this.handleError('react_error', event.error);
      }
    });
  }

  public handleError(type: string, error: Error | unknown, metadata?: Record<string, unknown>): void {
    if (!this.isMonitoring) {
      return;
    }

    const errorLog: ErrorLog = {
      timestamp: new Date(),
      type,
      message: error.message || String(error),
      stack: error.stack,
      metadata: {
        ...metadata,
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    };

    // Add to error logs with size limit
    this.errorLogs.push(errorLog);
    if (this.errorLogs.length > ErrorMonitor.MAX_ERROR_LOGS) {
      this.errorLogs.shift();
    }

    // Log the error
    console.error(`Frontend ${type}:`, errorLog.message, {
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

  private isCriticalError(type: string, error: unknown): boolean {
    // Define conditions for critical frontend errors
    const criticalConditions = [
      type === 'uncaught_error',
      type === 'react_error',
      (error as { fatal?: boolean })?.fatal === true,
      (error as { message?: string })?.message?.includes('ChunkLoadError'),
      (error as { message?: string })?.message?.includes('NetworkError'),
      (error as { message?: string })?.message?.includes('QuotaExceededError')
    ];

    return criticalConditions.some(condition => condition);
  }

  private handleCriticalError(errorLog: ErrorLog): void {
    console.error('Critical frontend error detected', errorLog);
    this.emit('critical_error', errorLog);

    // Implement recovery strategies
    this.attemptRecovery(errorLog);
  }

  private async attemptRecovery(errorLog: ErrorLog): Promise<void> {
    try {
      console.info('Attempting frontend recovery', { error: errorLog });

      // Implement different recovery strategies based on error type
      switch (errorLog.type) {
        case 'network_error':
          // Attempt to reconnect
          this.emit('recovery_action', 'reconnect');
          break;

        case 'chunk_error':
          // Attempt to reload resources
          this.emit('recovery_action', 'reload_chunks');
          break;

        case 'memory_error':
          // Clear some cache/storage
          this.emit('recovery_action', 'clear_cache');
          break;

        case 'react_error':
          // Attempt to remount component
          this.emit('recovery_action', 'remount');
          break;

        default:
          // Default recovery action
          this.emit('recovery_action', 'default');
      }

      console.info('Frontend recovery attempt completed');
    } catch (error) {
      console.error('Frontend recovery attempt failed', { error });
      this.emit('recovery_failed', { originalError: errorLog, recoveryError: error });
    }
  }

  public getErrorLogs(): ErrorLog[] {
    return [...this.errorLogs];
  }

  public clearErrorLogs(): void {
    this.errorLogs = [];
    console.info('Frontend error logs cleared');
  }
}