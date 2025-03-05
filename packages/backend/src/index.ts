import * as dotenv from 'dotenv';
import path from 'path';
import { logger } from './utils/logger';
import { AppEngine } from './engine/AppEngine';

// Load environment variables from .env file FIRST, before any other imports
dotenv.config({ path: path.resolve(process.cwd(), '.env'), debug: process.env.NODE_ENV !== 'production' });

// Log current working directory and env file path
logger.info('Current working directory:', process.cwd());
logger.info('Env file path:', path.resolve(process.cwd(), '.env'));

// Check if JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
} else {
  logger.info('JWT_SECRET is set');
}

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Get AppEngine instance and initialize it
    const appEngine = await AppEngine.getInstance();
    await appEngine.initialize();

    // Get the HTTP server
    const server = appEngine.getServer();

    // Start listening
    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });

    // Handle shutdown gracefully
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received. Starting graceful shutdown...');
      await appEngine.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received. Starting graceful shutdown...');
      await appEngine.shutdown();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  logger.error('Fatal error during startup:', error);
  process.exit(1);
});