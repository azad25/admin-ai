import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // File transport for error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Export a function to create a child logger with a specific context
export const createLogger = (context: string) => {
  return logger.child({ context });
};

// Initialize logging system
export async function initializeLogging(): Promise<void> {
  try {
    // Ensure logs directory exists
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Test file write access
    const testFile = path.join(logsDir, 'test.log');
    await fs.promises.writeFile(testFile, 'Test log entry\n');
    await fs.promises.unlink(testFile);

    // Test logging
    logger.info('Logging system initialized successfully');
    return Promise.resolve();
  } catch (error) {
    logger.error('Failed to initialize logging system:', error);
    return Promise.reject(error);
  }
}

// Custom logging methods for specific categories
export const authLogger = {
  log: (message: string, meta?: any) => {
    logger.info(message, { category: 'auth', ...meta });
  },
  error: (message: string, meta?: any) => {
    logger.error(message, { category: 'auth', ...meta });
  },
  warn: (message: string, meta?: any) => {
    logger.warn(message, { category: 'auth', ...meta });
  }
};

export const metricsLogger = {
  log: (message: string, meta?: any) => {
    logger.info(message, { category: 'metrics', ...meta });
  },
  error: (message: string, meta?: any) => {
    logger.error(message, { category: 'metrics', ...meta });
  },
  warn: (message: string, meta?: any) => {
    logger.warn(message, { category: 'metrics', ...meta });
  }
};

// Helper function to read logs
export const readLogs = async (type: 'error' | 'combined' | 'auth' | 'metrics', date: string): Promise<any[]> => {
  const logFile = path.join(logsDir, `${type}-${date}.log`);
  
  try {
    if (!fs.existsSync(logFile)) {
      return [];
    }
    
    const content = await fs.promises.readFile(logFile, 'utf-8');
    return content
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
  } catch (error) {
    logger.error(`Failed to read ${type} logs for date ${date}:`, error);
    return [];
  }
}; 