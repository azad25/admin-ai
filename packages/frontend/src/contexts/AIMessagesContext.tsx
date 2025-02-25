import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useSnackbar } from './SnackbarContext';
import { AIMessage } from '@admin-ai/shared/src/types/ai';

interface AIMessagesContextType {
  messages: AIMessage[];
  sendMessage: (content: string) => Promise<void>;
  markMessageAsRead: (messageId: string) => void;
  clearMessages: () => void;
  unreadCount: number;
}

const AIMessagesContext = createContext<AIMessagesContextType | undefined>(undefined);

export const useAIMessages = () => {
  const context = useContext(AIMessagesContext);
  if (!context) {
    throw new Error('useAIMessages must be used within an AIMessagesProvider');
  }
  return context;
};

export const AIMessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const { socket, isConnected } = useSocket();
  const { showError } = useSnackbar();

  const unreadCount = messages.filter(msg => !msg.metadata.read).length;

  const sendMessage = useCallback(async (content: string) => {
    if (!socket || !isConnected) {
      showError('Unable to send message: Not connected to server');
      return;
    }

    const message: AIMessage = {
      id: crypto.randomUUID(),
      content,
      role: 'user',
      metadata: {
        type: 'chat',
        timestamp: Date.now(),
        read: true,
        style: {
          color: '#1976d2',
          background: '#e3f2fd',
        }
      }
    };

    setMessages(prev => [...prev, message]);
    socket.emit('ai_message', { content });
  }, [socket, isConnected, showError]);

  const markMessageAsRead = useCallback((messageId: string) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, metadata: { ...msg.metadata, read: true } }
          : msg
      )
    );
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Listen for incoming AI messages
  useEffect(() => {
    if (!socket) return;

    const handleAIMessage = (message: AIMessage) => {
      setMessages(prev => [...prev, {
        ...message,
        metadata: {
          ...message.metadata,
          read: false,
          timestamp: Date.now(),
        }
      }]);
    };

    const handleNotification = (notification: AIMessage) => {
      setMessages(prev => [...prev, {
        ...notification,
        metadata: {
          ...notification.metadata,
          read: false,
          timestamp: Date.now(),
        }
      }]);
    };

    const handleError = (error: any) => {
      showError('Error receiving message: ' + (error.message || 'Unknown error'));
    };

    socket.on('ai_message', handleAIMessage);
    socket.on('notification', handleNotification);
    socket.on('error', handleError);

    return () => {
      socket.off('ai_message', handleAIMessage);
      socket.off('notification', handleNotification);
      socket.off('error', handleError);
    };
  }, [socket, showError]);

  return (
    <AIMessagesContext.Provider value={{ 
      messages, 
      sendMessage, 
      markMessageAsRead, 
      clearMessages,
      unreadCount 
    }}>
      {children}
    </AIMessagesContext.Provider>
  );
}; 