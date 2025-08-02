import { AppEngine } from './engine/AppEngine';
import { EventEmitter } from 'events';
import { WebSocketService } from './services/websocket.service';
import { logger } from './utils/logger';

// Load environment variables from .env file FIRST, before any other imports
require('dotenv').config();

// Set max listeners to high value to avoid warnings
EventEmitter.defaultMaxListeners = 20;

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const serverEvents = new EventEmitter();

const startServer = async () => {
  try {
    // Get AppEngine singleton instance
    const appEngine = await AppEngine.getInstance();
    
    // Initialize the AppEngine which sets up all services
    await appEngine.initialize();
    
    // Get the HTTP server
    const server = appEngine.getServer();
    if (!server) {
      throw new Error('HTTP server was not created');
    }
    
    // Get WebSocket service
    const wsService = await WebSocketService.getInstance();
    
    // Start listening on the server
    await new Promise<void>((resolve) => {
      server.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
        resolve();
      });
      
      server.on('error', (error: Error) => {
        logger.error('Server error:', error);
        // @ts-ignore
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${PORT} is already in use. Please free up the port or use a different port.`);
        }
        process.exit(1);
      });
    });
    
    // Log WebSocket status
    const ready = wsService.isInitialized();
    logger.info(`Server ready, WebSocket initialized: ${ready}`);
    
    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle shutdown gracefully
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Starting graceful shutdown...');
  const appEngine = await AppEngine.getInstance();
  await appEngine.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Starting graceful shutdown...');
  const appEngine = await AppEngine.getInstance();
  await appEngine.shutdown();
  process.exit(0);
});

// Export the event emitter for other modules to use
export { serverEvents };

// Start the server
startServer().catch((error) => {
  console.error('Unhandled server startup error:', error);
  process.exit(1);
});