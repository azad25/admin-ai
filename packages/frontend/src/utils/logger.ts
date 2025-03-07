type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

  private log(level: LogLevel, message: string, ...args: any[]) {
    // Skip specific warnings that are expected during normal operation
    if (message === 'Disconnected from AI service') {
      // Completely suppress disconnection messages
      return;
    }

    if (this.isDevelopment || level === 'error') {
      const timestamp = new Date().toISOString();
      const prefix = `[${level.toUpperCase()}] ${timestamp}`;
      console[level](prefix, message, ...args);
    }
  }

  debug(message: string, ...args: any[]) {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log('error', message, ...args);
  }
}

export const logger = new Logger(); 