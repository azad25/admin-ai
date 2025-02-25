import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { AIMessage } from '@admin-ai/shared/src/types/ai';
import { WebSocketService, wsService } from '../services/websocket.service';

interface SocketContextType {
  isConnected: boolean;
  sendNotification: (message: AIMessage) => void;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  sendNotification: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  const sendNotification = useCallback((message: AIMessage) => {
    if (isConnected) {
      wsService.send('notification', message);
    } else {
      console.warn('Cannot send notification: Socket not connected');
    }
  }, [isConnected]);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let isCleanedUp = false;

    const setupWebSocket = () => {
      if (isCleanedUp) return;

      const token = localStorage.getItem('token');
      if (!token || !user) {
        wsService.disconnect();
        setIsConnected(false);
        return;
      }

      wsService.setToken(token);
      wsService.connect();
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

      const token = localStorage.getItem('token');
      if (user && token) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(setupWebSocket, 3000);
      }
    };

    const handleError = (error: any) => {
      if (isCleanedUp) return;
      console.error('WebSocket error:', error);
      setIsConnected(false);

      const token = localStorage.getItem('token');
      if (user && token) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(setupWebSocket, 3000);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (!e.newValue) {
          wsService.disconnect();
          setIsConnected(false);
        } else if (user) {
          setupWebSocket();
        }
      }
    };

    wsService.on('connected', handleConnect);
    wsService.on('disconnected', handleDisconnect);
    wsService.on('error', handleError);
    window.addEventListener('storage', handleStorageChange);

    // Initial setup
    const token = localStorage.getItem('token');
    if (user && token && !isConnected) {
      setupWebSocket();
    }

    return () => {
      isCleanedUp = true;
      clearTimeout(reconnectTimeout);
      wsService.removeAllListeners('connected');
      wsService.removeAllListeners('disconnected');
      wsService.removeAllListeners('error');
      window.removeEventListener('storage', handleStorageChange);
      wsService.disconnect();
    };
  }, [user, isConnected]);

  return (
    <SocketContext.Provider value={{ isConnected, sendNotification }}>
      {children}
    </SocketContext.Provider>
  );
}; 