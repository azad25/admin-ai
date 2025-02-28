const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Custom format for log files
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  level: 'debug',
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // Combined logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m',
      format: logFormat,
    })
  ]
});

// Test logging
async function testLogging() {
  try {
    logger.info('Starting logging test...');
    
    // Test different log levels
    logger.debug('This is a debug message');
    logger.info('This is an info message');
    logger.warn('This is a warning message');
    logger.error('This is an error message');
    
    // Test structured logging
    logger.info('Testing structured logging', {
      service: 'AI',
      action: 'test',
      metadata: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    });

    // Test error logging
    try {
      throw new Error('Test error with stack trace');
    } catch (error) {
      logger.error('Caught test error', { error });
    }

    logger.info('Logging test completed');
    
    // List log files
    const files = fs.readdirSync(logsDir);
    console.log('\nLog files in logs directory:');
    files.forEach(file => {
      if (file.endsWith('.log')) {
        console.log(`- ${file}`);
      }
    });
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testLogging(); 