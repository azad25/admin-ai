import { logger } from '../utils/logger';
import { configService } from './config';
import { WebSocketService } from './websocket.service';
import { AuthService } from './auth.service';
import { aiSettingsService } from './aiSettings.service';
import { SystemMetricsService } from './systemMetrics.service';

const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 seconds

async function waitForBackend(): Promise<void> {
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const response = await fetch('http://localhost:3000/health');
      if (response.ok) {
        logger.info('Backend is ready');
        return;
      }
      logger.debug(`Backend health check failed (attempt ${retries + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      retries++;
    } catch (error) {
      logger.debug(`Backend not ready yet (attempt ${retries + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      retries++;
    }
  }
  throw new Error('Backend failed to become ready');
}

export async function initializeServices(): Promise<void> {
  try {
    // Wait for backend to be ready
    await waitForBackend();

    // Initialize services in sequence
    await configService.getConfig();

    const wsService = WebSocketService.getInstance();
    await wsService.connect('system'); // Connect with system user ID

    // Initialize auth service (no async initialization needed)
    AuthService.getInstance();

    await aiSettingsService.initialize();

    // Initialize system metrics service
    try {
      const systemMetricsService = SystemMetricsService.getInstance();
      logger.info('SystemMetricsService initialized successfully');
    } catch (error) {
      logger.error('SystemMetricsService initialization failed:', error);
      // Continue with other initializations even if this one fails
    }

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

// Export service instances
export { WebSocketService, aiSettingsService }; 