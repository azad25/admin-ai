import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AIService } from '../services/ai.service';
import { useWebSocket } from '../hooks/useWebSocket';
import { AIMessage } from '../types/ai';
import { useAuth } from '../contexts/AuthContext';

interface AIContextType {
  aiService: AIService;
  messages: AIMessage[];
  isProcessing: boolean;
  isConnected: boolean;
  addMessage: (message: AIMessage) => void;
  clearMessages: () => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { lastMessage, isConnected } = useWebSocket();
  const [aiService] = useState(() => AIService.getInstance());
  const { user } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    if (!user) return;
    
    // Initialize AI service with user ID
    aiService.initialize(user.id);
    initialized.current = true;
  }, [aiService, user]);

  useEffect(() => {
    if (lastMessage?.type === 'ai' && lastMessage.data) {
      addMessage(lastMessage.data);
    }
  }, [lastMessage]);

  const addMessage = (message: AIMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <AIContext.Provider
      value={{
        aiService,
        messages,
        isProcessing,
        isConnected,
        addMessage,
        clearMessages,
      }}
    >
      {children}
    </AIContext.Provider>
  );
}; 