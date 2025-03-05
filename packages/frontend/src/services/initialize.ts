import { wsService } from './websocket.service';
import { aiSettingsService } from './aiSettings.service';
import { logger } from '../utils/logger';
import { authService } from './auth';
import { SystemMetricsService } from './systemMetrics.service';

// Initialize all services
export const initializeServices = async () => {
  try {
    logger.info('Starting service initialization...');
    
    // Check if user is authenticated before initializing services that require authentication
    const isAuthenticated = authService.isAuthenticated();
    
    if (isAuthenticated) {
      // Initialize services that require authentication
      try {
        await aiSettingsService.initialize();
        logger.info('AISettingsService initialized successfully');
      } catch (error) {
        logger.error('AISettingsService initialization failed:', error);
        // Continue with other initializations even if this one fails
      }
      
      // Initialize system metrics service
      try {
        const systemMetricsService = SystemMetricsService.getInstance();
        logger.info('SystemMetricsService initialized successfully');
      } catch (error) {
        logger.error('SystemMetricsService initialization failed:', error);
        // Continue with other initializations even if this one fails
      }
    } else {
      logger.info('Skipping authenticated service initialization - user not authenticated');
    }
    
    // Expose services to window object if in browser environment
    if (typeof window !== 'undefined') {
      window.wsService = wsService;
      window.aiSettingsService = aiSettingsService;
      logger.info('Services initialized and exposed to window object');
    }
    
    logger.info('Service initialization completed');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    // Don't throw the error to allow the application to continue loading
    // This prevents a complete application failure if services fail to initialize
  }
};

// Export services for direct import
export { wsService, aiSettingsService }; 