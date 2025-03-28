import * as dotenv from 'dotenv';
import * as path from 'path';
import { logger } from './utils/logger';
import { AppEngine } from './engine/AppEngine';
import { EventEmitter } from 'events';

// Load environment variables from .env file FIRST, before any other imports
dotenv.config({ path: path.resolve(__dirname, '../.env'), debug: process.env.NODE_ENV !== 'production' });

// Log current working directory and env file path
logger.info('Current working directory:', process.cwd());
logger.info('Env file path:', path.resolve(__dirname, '../.env'));

// Check if JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
} else {
  logger.info('JWT_SECRET is set');
}

const PORT = process.env.PORT || 3000;

// Create an event emitter for server events
const serverEvents = new EventEmitter();

async function startServer() {
  let appEngine: AppEngine | null = null;
  
  try {
    // Get AppEngine instance and initialize it
    appEngine = await AppEngine.getInstance();
    await appEngine.initialize();

    // Get the HTTP server
    const server = appEngine.getServer();
    if (!server) {
      throw new Error('HTTP server was not created');
    }

    // Start listening with error handling
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 10000);

      server.listen(PORT, () => {
        clearTimeout(timeout);
        logger.info(`Server is running on port ${PORT}`);
        // Emit a ready event that can be used by other services
        serverEvents.emit('ready');
        resolve();
      });

      server.on('error', (error: Error) => {
        clearTimeout(timeout);
        logger.error('Server error:', error);
        if (error.message.includes('EADDRINUSE')) {
          logger.error(`Port ${PORT} is already in use. Please free up the port or use a different port.`);
          process.exit(1);
        }
        reject(error);
      });
    });

    // Handle shutdown gracefully
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received. Starting graceful shutdown...');
      if (appEngine) {
        await appEngine.shutdown();
      }
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received. Starting graceful shutdown...');
      if (appEngine) {
        await appEngine.shutdown();
      }
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    if (appEngine) {
      try {
        await appEngine.shutdown();
      } catch (shutdownError) {
        logger.error('Error during shutdown:', shutdownError);
      }
    }
    process.exit(1);
  }
}

// Export the event emitter for other modules to use
export { serverEvents };

// Start the server
startServer().catch((error) => {
  logger.error('Fatal error during startup:', error);
  process.exit(1);
});