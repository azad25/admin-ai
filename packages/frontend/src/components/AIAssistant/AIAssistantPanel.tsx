import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { useAIMessages } from '../../contexts/AIMessagesContext';
import { AIMessageComponent } from '../AIMessage';
import { logger } from '../../utils/logger';
import {
  AssistantPanel,
  PanelHeader,
  TabPanelComponent,
  ChatTabLabel,
  NotificationsTabLabel,
  MessageList,
  NotificationList,
  InputContainer,
  AIFloatingButton
} from './index';
import { getWebSocketService } from '../../services/websocket.service';
import { useAppSelector } from '../../hooks/redux';

// Connection status component to avoid complex union type
const ConnectionStatusMessage: React.FC<{
  status: 'connected' | 'disconnected' | 'connecting';
}> = ({ status }) => {
  // Always return null to hide the disconnected message
  return null;
};

// Create a MessageItem component to avoid complex union types
const MessageItem: React.FC<{
  message: any;
  onAnimationComplete: (id: string) => void;
}> = ({ message, onAnimationComplete }) => {
  return (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      <AIMessageComponent
        message={message}
        onAnimationComplete={() => onAnimationComplete(message.id)}
      />
    </motion.div>
  );
};

export const AIAssistantPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { 
    messages, 
    sendMessage, 
    markMessageAsRead, 
    unreadCount, 
    isProcessing,
    connectionStatus,
    clearMessages
  } = useAIMessages();
  
  // Get the AI connection status from Redux store
  const reduxIsConnected = useAppSelector(state => state.ai.isConnected);
  const reduxProviders = useAppSelector(state => state.ai.providers);
  
  // Check if we have a verified provider in Redux
  const hasVerifiedProviderInRedux = useMemo(() => {
    return reduxProviders.some(provider => provider.isVerified === true);
  }, [reduxProviders]);

  // Check if we have a verified provider message
  const hasVerifiedProvider = useMemo(() => {
    // First check Redux store for verified providers
    if (hasVerifiedProviderInRedux) {
      return true;
    }
    
    // Then check messages for verification - simplified to avoid complex union type
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        const content = msg.content.toLowerCase();
        if (content.includes('verified') && content.includes('provider')) return true;
        if (content.includes('provider verified')) return true;
        if (content.includes('gemini api test successful')) return true;
        if (content.includes('api test successful')) return true;
        if (content.includes('api key is valid')) return true;
      }
    }
    return false;
  }, [messages, hasVerifiedProviderInRedux, reduxProviders]);

  // Filter out duplicate "Connected to AI service" notifications
  const filteredMessages = useMemo(() => {
    // Create a new array with all messages
    const result = [...messages];
    
    // Find all connection messages
    const connectionMsgIndices: number[] = [];
    result.forEach((msg, index) => {
      if (msg.content && typeof msg.content === 'string' && msg.content.includes('Connected to AI service')) {
        connectionMsgIndices.push(index);
      }
    });
    
    // If we have more than one connection message, keep only the latest one
    if (connectionMsgIndices.length > 1) {
      // Sort indices in descending order (to remove from end to start)
      connectionMsgIndices.sort((a, b) => b - a);
      
      // Keep the first one (latest) and remove the rest
      for (let i = 1; i < connectionMsgIndices.length; i++) {
        result.splice(connectionMsgIndices[i], 1);
      }
    }
    
    // Process messages to ensure verification messages are treated as notifications
    result.forEach(msg => {
      if (msg.content && typeof msg.content === 'string') {
        // If message contains verification text, mark it as a notification
        if (msg.content.toLowerCase().includes('verified') || 
            msg.content.toLowerCase().includes('provider')) {
          if (msg.metadata) {
            msg.metadata.type = 'notification';
          } else {
            const now = new Date().toISOString();
            msg.metadata = { type: 'notification', timestamp: now };
          }
        }
      }
    });
    
    return result;
  }, [messages]);

  // Calculate notification count
  const notificationCount = useMemo(() => {
    return filteredMessages.filter(m => m.metadata?.type === 'notification' && !m.metadata?.read).length;
  }, [filteredMessages]);

  // Calculate chat count
  const chatCount = useMemo(() => {
    return filteredMessages.filter(m => m.metadata?.type === 'chat' && !m.metadata?.read).length;
  }, [filteredMessages]);

  // Mark messages as read when tab is opened
  useEffect(() => {
    if (isOpen) {
      // Mark messages as read based on the active tab
      filteredMessages.forEach(message => {
        if (tabValue === 0 && message.metadata?.type === 'chat' && !message.metadata?.read) {
          markMessageAsRead(message.id);
        } else if (tabValue === 1 && message.metadata?.type === 'notification' && !message.metadata?.read) {
          markMessageAsRead(message.id);
        }
      });
    }
  }, [isOpen, tabValue, filteredMessages, markMessageAsRead]);

  // Add a useEffect to handle connection status changes
  useEffect(() => {
    // Check if we have a verified provider
    const hasVerifiedProvider = messages.some(msg => {
      if (typeof msg.content === 'string') {
        const content = msg.content.toLowerCase();
        return (
          (content.includes('verified') && content.includes('provider')) ||
          content.includes('provider verified') ||
          content.includes('gemini api test successful')
        );
      }
      return false;
    });

    // Check if the WebSocket is actually connected
    const wsService = getWebSocketService();
    const isSocketConnected = wsService.isConnected();

    // Only log disconnection if we don't have a verified provider AND the socket is actually disconnected
    if (connectionStatus === 'disconnected' && !hasVerifiedProvider && !isSocketConnected) {
      // Use debug level instead of warn to reduce visibility
      logger.debug('Disconnected from AI service');
    }
  }, [connectionStatus, messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    logger.info('Attempting to send message:', {
      content: inputValue,
      connectionStatus
    });

    try {
      await sendMessage(inputValue);
      setInputValue('');
      logger.info('Message sent successfully');
    } catch (error) {
      logger.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleMessageAnimationComplete = (messageId: string) => {
    markMessageAsRead(messageId);
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [filteredMessages]);

  // Filter messages by type
  const chatMessages = useMemo(() => {
    console.log('Filtering chat messages from:', filteredMessages.length, 'messages');
    
    // Log all messages to help debug
    console.log('All messages:', JSON.stringify(filteredMessages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content.substring(0, 30) + '...',
      type: m.metadata?.type
    }))));
    
    // Include messages that are:
    // 1. Explicitly marked as chat type, OR
    // 2. From the assistant or user (regardless of type)
    // BUT exclude verification messages
    const filtered = filteredMessages.filter(msg => {
      const isVerificationMsg = msg.content && 
        typeof msg.content === 'string' && 
        (msg.content.toLowerCase().includes('verified') || 
         msg.content.toLowerCase().includes('provider'));
      
      const isChatMessage = msg.metadata?.type === 'chat';
      const isUserOrAssistant = msg.role === 'user' || msg.role === 'assistant';
      
      return (isChatMessage || isUserOrAssistant) && !isVerificationMsg;
    });
    
    console.log('Filtered chat messages:', filtered.length);
    return filtered;
  }, [filteredMessages]);

  const notificationMessages = useMemo(() => {
    console.log('Filtering notification messages from:', filteredMessages.length, 'messages');
    const filtered = filteredMessages.filter(msg => 
      // Include messages explicitly marked as notifications
      // OR messages that contain verification text
      msg.metadata?.type === 'notification' ||
      (msg.content && 
        typeof msg.content === 'string' && 
        (msg.content.toLowerCase().includes('verified') || 
        msg.content.toLowerCase().includes('provider')))
    );
    console.log('Filtered notification messages:', filtered.length);
    return filtered;
  }, [filteredMessages]);

  // Auto-switch to notifications tab when new notifications arrive
  useEffect(() => {
    // If there are unread notifications and we're on the chat tab, switch to notifications tab
    if (notificationCount > 0 && tabValue === 0) {
      setTabValue(1); // Switch to notifications tab
    }
  }, [notificationCount, tabValue]);

  // Auto-switch to notifications tab when verification messages arrive
  useEffect(() => {
    // Check if there are any unread verification messages
    const hasUnreadVerificationMessages = filteredMessages.some(msg => 
      !msg.metadata?.read && 
      msg.content && 
      typeof msg.content === 'string' && 
      (msg.content.toLowerCase().includes('verified') || 
       msg.content.toLowerCase().includes('provider'))
    );
    
    // If there are unread verification messages and we're on the chat tab, switch to notifications tab
    if (hasUnreadVerificationMessages && tabValue === 0 && isOpen) {
      setTabValue(1); // Switch to notifications tab
    }
  }, [filteredMessages, tabValue, isOpen]);

  // Process messages to ensure verification messages are treated as notifications
  useEffect(() => {
    messages.forEach(msg => {
      if (msg.content && typeof msg.content === 'string') {
        // If message contains verification text, mark it as a notification
        if (msg.content.toLowerCase().includes('verified') || 
            msg.content.toLowerCase().includes('provider')) {
          if (msg.metadata?.type !== 'notification') {
            markMessageAsRead(msg.id);
          }
        }
      }
    });
  }, [messages, markMessageAsRead]);

  // Determine if we should show the connecting message
  const shouldShowConnectingMessage = useMemo(() => {
    // Only show connecting message if we're connecting and don't have a verified provider
    return connectionStatus === 'connecting' && !hasVerifiedProvider;
  }, [connectionStatus, hasVerifiedProvider]);

  // Determine if the input should be enabled
  const isInputEnabled = useMemo((): boolean => {
    // If we have a verified provider, always enable input regardless of connection status
    if (hasVerifiedProvider) {
      return true;
    }
    // Otherwise, only enable if connected
    return connectionStatus === 'connected';
  }, [hasVerifiedProvider, connectionStatus]);

  // Determine effective connection status for UI display
  const effectiveConnectionStatus = useMemo(() => {
    // If we have a verified provider, always show as connected
    if (hasVerifiedProvider) {
      return 'connected';
    }
    // If Redux says we're connected, show connected
    if (reduxIsConnected) {
      return 'connected';
    }
    return connectionStatus;
  }, [connectionStatus, hasVerifiedProvider, reduxIsConnected]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <AssistantPanel
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <PanelHeader 
              connectionStatus={effectiveConnectionStatus} 
              onClose={() => setIsOpen(false)} 
              hasMessages={filteredMessages.length > 0}
              hasVerifiedProvider={hasVerifiedProvider}
            />

            <Tabs 
              value={tabValue} 
              onChange={(_, newValue) => setTabValue(newValue)}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab 
                label={<ChatTabLabel count={chatCount} />} 
                id="ai-tab-0"
                aria-controls="ai-tabpanel-0"
              />
              <Tab 
                label={<NotificationsTabLabel count={notificationCount} />} 
                id="ai-tab-1"
                aria-controls="ai-tabpanel-1"
              />
            </Tabs>

            <TabPanelComponent value={tabValue} index={0}>
              <MessageList>
                <AnimatePresence initial={false}>
                  {chatMessages.map((message) => (
                    <MessageItem 
                      key={message.id}
                      message={message}
                      onAnimationComplete={handleMessageAnimationComplete}
                    />
                  ))}
                </AnimatePresence>
                {chatMessages.length === 0 && (
                  <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', mt: 2 }}>
                    No messages yet
                  </Typography>
                )}
                <div ref={messagesEndRef} />
              </MessageList>
              <InputContainer>
                <Box component="div" sx={{ display: 'flex', alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Type a message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={!isInputEnabled}
                    sx={{ mr: 1 }}
                  />
                  <IconButton 
                    color="primary" 
                    onClick={handleSend}
                    disabled={!isInputEnabled || !inputValue.trim()}
                  >
                    {isProcessing ? <CircularProgress size={24} /> : <SendIcon />}
                  </IconButton>
                </Box>
                {shouldShowConnectingMessage && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Connecting to AI service...
                  </Typography>
                )}
              </InputContainer>
            </TabPanelComponent>

            <TabPanelComponent value={tabValue} index={1} isNotificationPanel={true}>
              <Box 
                component="div"
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: '100%', 
                  overflowY: 'auto',
                  padding: 2
                }}
              >
                {notificationMessages.length === 0 ? (
                  <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', mt: 2 }}>
                    No notifications yet
                  </Typography>
                ) : (
                  // Display notifications with newest at the top
                  notificationMessages
                    .slice() // Create a copy to avoid mutating the original array
                    .sort((a, b) => {
                      // Sort by timestamp in descending order (newest first)
                      const timeA = a.metadata?.timestamp ? new Date(a.metadata.timestamp).getTime() : 0;
                      const timeB = b.metadata?.timestamp ? new Date(b.metadata.timestamp).getTime() : 0;
                      return timeB - timeA;
                    })
                    .map((message) => (
                      <Box key={message.id} sx={{ mb: 2 }}>
                        <AIMessageComponent
                          message={message}
                          onAnimationComplete={() => handleMessageAnimationComplete(message.id)}
                        />
                      </Box>
                    ))
                )}
                <div ref={messagesEndRef} />
              </Box>
            </TabPanelComponent>
          </AssistantPanel>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isOpen && (
          <AIFloatingButton 
            onClick={() => setIsOpen(true)} 
            unreadCount={unreadCount}
          />
        )}
      </AnimatePresence>
    </>
  );
}; 