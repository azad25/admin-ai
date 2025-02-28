import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file FIRST, before any other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Check required environment variables
const requiredEnvVars = ['JWT_SECRET', 'PORT', 'NODE_ENV'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`${envVar} environment variable is not set`);
  }
}

import express from 'express';
import { createServer } from 'http';
import { logger } from './utils/logger';
import { AppDataSource } from './database';
import { createApp } from './app';
import { WebSocketService } from './services/websocket.service';
import { AIService } from './services/ai.service';
import { kafkaService } from './services/kafka.service';
import { AIMonitorMiddleware } from './middleware/aiMonitor.middleware';
import { requestQueueMiddleware } from './middleware/requestQueue.middleware';
import { systemMetricsService } from './services/systemMetrics.service';
import { MonitoringService } from './services/monitoring.service';
import { CacheService } from './services/cache.service';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { requestTrackerMiddleware } from './middleware/requestTracker.middleware';
import { startTableWorker } from './workers/tableWorker';
import { setupLogsDirectory } from './scripts/setupLogs';
import { AppEngine } from './engine/AppEngine';
import { AdminAI } from './core/AdminAI';
import { setupDatabase } from './database';

async function initializeLogging() {
  try {
    // Set up logs directory and files
    setupLogsDirectory();
    logger.info('Logging system initialized');
  } catch (error) {
    console.error('Failed to initialize logging system:', error);
    throw error;
  }
}

async function initializeDatabase() {
  const maxRetries = 5;
  let retries = 0;
  const retryDelay = 2000; // 2 seconds

  while (retries < maxRetries) {
    try {
      if (!AppDataSource.isInitialized) {
        logger.info('Initializing database connection...');
        await AppDataSource.initialize();
        logger.info('Database initialized successfully');
      }

      // Verify connection
      await AppDataSource.query('SELECT 1');
      logger.info('Database connection verified');
      return;
    } catch (error) {
      retries++;
      logger.error(`Database initialization attempt ${retries} failed:`, error);

      if (retries < maxRetries) {
        logger.info(`Waiting ${retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw new Error(`Failed to initialize database after ${maxRetries} attempts`);
}

async function initializeKafka() {
  try {
    await kafkaService.connect();
    
    // Create and subscribe to standard topics
    await Promise.all([
      kafkaService.createTopic('crud-page-events'),
      kafkaService.createTopic('request-events'),
      kafkaService.createTopic('ai-events'),
      kafkaService.createTopic('auth-events'),
      kafkaService.createTopic('metrics-events')
    ]);

    await kafkaService.subscribeToTopics(
      ['crud-page-events', 'request-events', 'ai-events'],
      'admin-ai-group',
      async (payload) => {
        logger.info(`Received message from topic ${payload.topic}:`, payload.message);
      }
    );

    logger.info('Kafka initialized');
  } catch (error) {
    logger.error('Failed to initialize Kafka:', error);
    // Don't throw error, as Kafka is not critical for the application
    logger.warn('Continuing without Kafka');
  }
}

async function initializeMiddleware() {
  try {
    await requestQueueMiddleware.initialize();
    await startTableWorker();
    logger.info('Middleware initialized');
  } catch (error) {
    logger.error('Failed to initialize middleware:', error);
    throw error;
  }
}

async function initializeServices(wsService: WebSocketService) {
  try {
    // Initialize monitoring service first
    const monitoringService = MonitoringService.getInstance();
    await monitoringService.initialize();
    logger.info('Monitoring service initialized');

    // Initialize AI service
    const aiService = new AIService();
    aiService.setWebSocketService(wsService);
    wsService.setAIService(aiService);
    logger.info('AI service initialized and connected to WebSocket service');

    // Set up monitoring service with AI service
    monitoringService.setAIService(aiService);

    // Set up WebSocket service with monitoring
    wsService.setMonitoringService(monitoringService);
    logger.info('WebSocket service configured');

    // Configure Kafka service
    kafkaService.setWebSocketService(wsService);
    logger.info('Kafka service configured');

    // Initialize system metrics service last
    await systemMetricsService.initializeServices(wsService, aiService);
    logger.info('System metrics service initialized');

    // Verify database connection is still active
    await AppDataSource.query('SELECT 1');
    logger.info('All services verified and running');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

async function startServer() {
  let server: ReturnType<typeof createServer> | undefined;
  let wsService: WebSocketService | undefined;
  let adminAI: AdminAI | undefined;

  const handleShutdown = async () => {
    logger.info('Shutting down server...');
    try {
      // Close server first
      if (server) {
        await new Promise<void>((resolve) => {
          server!.close(() => {
            logger.info('Server closed');
            resolve();
          });
        });
      }

      // Shutdown WebSocket service
      wsService?.shutdown();

      // Then shutdown AdminAI (which will handle all services)
      if (adminAI) {
        await adminAI.shutdown();
      }

      // Finally, close database connection
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        logger.info('Database connection closed');
      }

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  try {
    // Initialize logging first
    await initializeLogging();

    // Initialize database before anything else
    await initializeDatabase();

    // Create base Express app
    const baseApp = express();

    // Create HTTP server
    server = createServer(baseApp);

    // Initialize WebSocket service with the server
    wsService = WebSocketService.getInstance();
    wsService.initialize(server);

    // Initialize services
    await initializeServices(wsService);

    // Initialize AdminAI after all services are ready
    adminAI = AdminAI.getInstance();
    await adminAI.initialize();

    // Create configured Express app with initialized services
    const configuredApp = await createApp(wsService);

    // Replace base app routes with configured app
    baseApp.use(configuredApp);

    // Start server
    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });

    // Handle server errors
    server.on('error', (error: Error) => {
      logger.error('Server error:', error);
      adminAI?.getService('errorMonitor')?.handleError('server_error', error);
    });

    // Set up process termination handlers
    process.on('SIGTERM', handleShutdown);
    process.on('SIGINT', handleShutdown);

    // Log successful startup
    logger.info('Server startup completed successfully');
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer(); 