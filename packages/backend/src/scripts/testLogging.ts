import { logger } from '../utils/logger';

async function testLogging() {
  try {
    // Test different log levels
    logger.debug('Debug test message');
    logger.info('Info test message');
    logger.warn('Warning test message');
    logger.error('Error test message');
    
    // Test structured logging
    logger.info('Structured log test', {
      service: 'AI',
      action: 'test',
      metadata: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    });

    // Test error logging with stack trace
    try {
      throw new Error('Test error with stack trace');
    } catch (error) {
      logger.error('Caught test error', error);
    }

    console.log('Logging test completed. Check the log files in the logs directory.');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testLogging();
}

export { testLogging }; 