import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { AIMessage } from '@admin-ai/shared/src/types/ai';
import { WebSocketService, wsService } from '../services/websocket.service';

interface SocketContextType {
  isConnected: boolean;
  socket: WebSocketService;
  sendNotification: (message: AIMessage) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const auth = useAuth();
  
  if (!auth) {
    throw new Error('SocketProvider must be used within an AuthProvider');
  }

  const { user, isAuthenticated } = auth;

  const sendNotification = useCallback((message: AIMessage) => {
    if (isConnected) {
      wsService.send('notification', message);
    } else {
      console.warn('Cannot send notification: Socket not connected');
    }
  }, [isConnected]);

  useEffect(() => {
    let isCleanedUp = false;
    let reconnectTimeout: NodeJS.Timeout;

    const setupWebSocket = async () => {
      if (isCleanedUp || !isAuthenticated || !user) return;

      try {
        await wsService.connect();
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    };

    const handleConnect = () => {
      if (isCleanedUp) return;
      setIsConnected(true);
      console.info('WebSocket connected');
    };

    const handleDisconnect = () => {
      if (isCleanedUp) return;
      setIsConnected(false);
      console.warn('WebSocket disconnected');

      if (isAuthenticated && user) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(setupWebSocket, 3000);
      }
    };

    const handleError = (error: any) => {
      if (isCleanedUp) return;
      console.error('WebSocket error:', error);
      setIsConnected(false);

      if (isAuthenticated && user) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(setupWebSocket, 3000);
      }
    };

    if (isAuthenticated && user) {
      wsService.on('connected', handleConnect);
      wsService.on('disconnected', handleDisconnect);
      wsService.on('error', handleError);

      setupWebSocket();
    } else {
      wsService.disconnect();
      setIsConnected(false);
    }

    return () => {
      isCleanedUp = true;
      clearTimeout(reconnectTimeout);
      wsService.off('connected', handleConnect);
      wsService.off('disconnected', handleDisconnect);
      wsService.off('error', handleError);
    };
  }, [user, isAuthenticated]);

  return (
    <SocketContext.Provider value={{ 
      isConnected,
      socket: wsService,
      sendNotification
    }}>
      {children}
    </SocketContext.Provider>
  );
}; 