import { useEffect, useCallback } from 'react';
import { aiService } from '../services/ai.service';
import { wsService } from '../services/websocket.service';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setError } from '../store/slices/aiSlice';

export const useAIServices = () => {
  const dispatch = useAppDispatch();
  const {
    isInitialized,
    isProcessing,
    isConnected,
    error,
    messages,
    providers
  } = useAppSelector(state => state.ai);

  const sendMessage = useCallback(async (content: string) => {
    try {
      await aiService.sendMessage(content);
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : 'Failed to send message'));
    }
  }, [dispatch]);

  const clearMessages = useCallback(() => {
    aiService.clearMessages();
  }, []);

  useEffect(() => {
    const initializeServices = async () => {
      try {
        await wsService.connect();
      } catch (error) {
        dispatch(setError(error instanceof Error ? error.message : 'Failed to connect to WebSocket'));
      }
    };

    initializeServices();

    return () => {
      wsService.disconnect();
    };
  }, [dispatch]);

  return {
    wsService,
    aiService,
    isInitialized,
    isProcessing,
    isConnected,
    error,
    messages,
    providers,
    sendMessage,
    clearMessages
  };
}; 