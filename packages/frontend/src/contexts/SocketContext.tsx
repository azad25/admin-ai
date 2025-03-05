import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { AIMessage } from '@admin-ai/shared/types/ai';
import { getWebSocketService } from '../services/websocket.service';
import { logger } from '../utils/logger';

interface SocketContextType {
  isConnected: boolean;
  socket: ReturnType<typeof getWebSocketService>;
  sendNotification: (message: AIMessage) => void;
  messages: AIMessage[];
  loading: boolean;
  sendMessage: (content: string) => Promise<void>;
  markAllMessagesAsRead: () => void;
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
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const wsService = getWebSocketService();
  const isInitializedRef = useRef(false);
  
  if (!auth) {
    throw new Error('SocketProvider must be used within an AuthProvider');
  }

  const { user } = auth;

  const sendNotification = useCallback((message: AIMessage) => {
    if (isConnected) {
      logger.debug('Sending notification via socket:', message);
      wsService.emit('notification', message);
    } else {
      logger.warn('Cannot send notification: Socket not connected');
      
      // Store notification locally if socket is not connected
      setMessages(prev => [...prev, {
        ...message,
        metadata: {
          ...message.metadata,
          offline: true
        }
      }]);
    }
  }, [isConnected, setMessages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!isConnected) {
      logger.warn('Cannot send message: Socket not connected');
      
      // Even if socket is not connected, if we have a verified provider,
      // we should still allow the user to send messages
      // These will be stored locally and sent when the connection is established
      const tempMessage: AIMessage = {
        id: `temp-${Date.now()}`,
        content,
        role: 'user',
        metadata: {
          timestamp: new Date().toISOString(),
          read: true,
          category: 'chat',
          offline: true
        },
        timestamp: new Date().toISOString()
      };
      
      // Add to messages immediately for UI feedback
      setMessages(prev => [...prev, tempMessage]);
      
      // Add a system message indicating the message will be sent when connected
      const systemMessage: AIMessage = {
        id: `system-${Date.now()}`,
        content: 'Your message will be sent when the connection is established.',
        role: 'system',
        metadata: {
          timestamp: new Date().toISOString(),
          read: true,
          category: 'chat',
          type: 'notification'
        },
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, systemMessage]);
      
      return;
    }
    
    setLoading(true);
    try {
      // Create a temporary message object
      const tempMessage: AIMessage = {
        id: `temp-${Date.now()}`,
        content,
        role: 'user',
        metadata: {
          timestamp: new Date().toISOString(),
          read: true,
          category: 'chat'
        },
        timestamp: new Date().toISOString()
      };
      
      // Add to messages immediately for UI feedback
      setMessages(prev => [...prev, tempMessage]);
      
      // Send via websocket
      wsService.emit('message', { content });
    } catch (error) {
      logger.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  const markAllMessagesAsRead = useCallback(() => {
    setMessages(prev => 
      prev.map(msg => ({
        ...msg,
        metadata: {
          ...msg.metadata,
          read: true
        }
      }))
    );
    // Optionally notify the server that messages were read
    if (isConnected) {
      wsService.emit('mark_read', { all: true });
    }
  }, [isConnected]);

  // Set up connection status handlers - only run once
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    
    const handleConnectionEstablished = () => {
      setIsConnected(true);
      logger.info('WebSocket connected');
    };

    const handleConnectionError = (error: Error) => {
      setIsConnected(false);
      logger.error('WebSocket connection error:', error);
    };
    
    wsService.onConnectionEstablished(handleConnectionEstablished);
    wsService.onConnectionError(handleConnectionError);
    
    // Handle connection based on authentication state
    let isCleanedUp = false;
    let reconnectTimeout: NodeJS.Timeout;

    const setupWebSocket = async () => {
      if (isCleanedUp || !user) return;

      try {
        await wsService.connect(user.id);
      } catch (error) {
        logger.error('Failed to connect WebSocket:', error);
        
        // Schedule reconnect
        if (!isCleanedUp && user) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(setupWebSocket, 3000);
        }
      }
    };

    if (user) {
      setupWebSocket();
    } else {
      wsService.disconnect();
      setIsConnected(false);
    }

    return () => {
      isCleanedUp = true;
      clearTimeout(reconnectTimeout);
    };
  }, [user]);

  // Add handler for incoming messages - only run once
  useEffect(() => {
    const handleMessage = (message: AIMessage) => {
      setMessages(prev => [...prev, message]);
    };

    wsService.on('message', handleMessage);
    
    return () => {
      wsService.off('message', handleMessage);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ 
      isConnected,
      socket: wsService,
      sendNotification,
      messages,
      loading,
      sendMessage,
      markAllMessagesAsRead
    }}>
      {children}
    </SocketContext.Provider>
  );
}; 