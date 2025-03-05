import { wsService } from '../services/websocket.service';
import { logger } from './logger';

/**
 * Utility function to test the WebSocket connection
 * @param userId The user ID to connect with
 */
export const testWebSocketConnection = async (userId: string): Promise<void> => {
  logger.info('Testing WebSocket connection...');
  logger.info('WebSocket configuration:', {
    url: import.meta.env.VITE_WS_URL || 'http://localhost:3000',
    path: import.meta.env.VITE_WS_PATH || '/ws'
  });
  
  // Set up callbacks
  wsService.onConnectionEstablished(() => {
    logger.info('✅ WebSocket connection established successfully');
    logger.info('Connection details:', {
      connected: wsService.isConnected(),
      socketConnected: wsService.isSocketConnected(),
      initialized: wsService.isInitialized(),
      socketId: wsService.getSocketId()
    });
  });
  
  wsService.onConnectionError((error) => {
    logger.error('❌ WebSocket connection error:', error);
  });
  
  // Listen for events
  wsService.on('connect', () => {
    logger.info('✅ WebSocket connected event received');
  });
  
  wsService.on('disconnect', (reason) => {
    logger.warn(`❌ WebSocket disconnected: ${reason}`);
  });
  
  wsService.on('connection:reconnecting', (data) => {
    logger.info(`🔄 WebSocket reconnecting: Attempt ${data.attempt}/${data.maxAttempts}`);
  });
  
  wsService.on('connection:failed', (data) => {
    logger.error(`❌ WebSocket connection failed after ${data.attempts} attempts`);
  });
  
  // Attempt to connect
  logger.info(`Attempting to connect with userId: ${userId}`);
  try {
    await wsService.connect(userId);
    
    // Check connection status after a short delay
    setTimeout(() => {
      const isConnected = wsService.isConnected();
      const isSocketConnected = wsService.isSocketConnected();
      
      if (isConnected && isSocketConnected) {
        logger.info('✅ Connection check: WebSocket is connected');
        logger.info('Socket ID:', wsService.getSocketId());
      } else {
        logger.error('❌ Connection check: WebSocket is not connected', {
          isConnected,
          isSocketConnected
        });
      }
    }, 2000);
  } catch (error) {
    logger.error('❌ Error during connection attempt:', error);
  }
};

/**
 * Force a WebSocket reconnection
 */
export const forceWebSocketReconnect = (): void => {
  logger.info('Forcing WebSocket reconnection...');
  // Access the private reconnect method using type assertion
  (wsService as any).reconnect();
};

// Add to window object for console access
if (typeof window !== 'undefined') {
  (window as any).testWebSocketConnection = testWebSocketConnection;
  (window as any).forceWebSocketReconnect = forceWebSocketReconnect;
} 