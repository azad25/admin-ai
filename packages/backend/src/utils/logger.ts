import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

export async function initializeLogging(): Promise<void> {
  try {
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }

    // Set permissions for logs directory
    await fs.promises.chmod(logsDir, 0o755);
    logger.info('Set permissions for logs directory');
    logger.info('Logs directory setup completed successfully');
    logger.info('Logging system initialized');
  } catch (error) {
    logger.error('Failed to initialize logging system:', error);
    throw error;
  }
}

// Custom format for log files
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Error logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d', // Keep logs for 30 days
      maxSize: '20m', // 20MB
      format: logFormat,
    }),
    
    // Combined logs (info, warn, error)
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m',
      format: logFormat,
    }),

    // Auth logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'auth-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m',
      format: logFormat,
    }),

    // System metrics logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'metrics-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m',
      format: logFormat,
    })
  ],
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m',
      format: logFormat,
    })
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m',
      format: logFormat,
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
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