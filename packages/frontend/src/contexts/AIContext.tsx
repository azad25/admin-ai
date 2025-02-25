import React, { createContext, useContext, useState, useEffect } from 'react';
import { AIService } from '../services/ai.service';
import { useWebSocket } from '../hooks/useWebSocket';
import { AIMessage } from '../types/ai';

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
  const [aiService] = useState(() => new AIService());

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