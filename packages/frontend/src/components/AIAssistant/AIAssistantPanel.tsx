import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Avatar
} from '@mui/material';
import { Send as SendIcon, SmartToy as BotIcon } from '@mui/icons-material';
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
import { styled } from '@mui/material/styles';

// Typing animation components
const TypingContainer = styled(motion.div)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: theme.spacing(2),
  marginLeft: theme.spacing(2),
  width: 'calc(100% - 32px)',
}));

const AvatarContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginRight: '8px',
});

const TypingBubble = styled(motion.div)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1.5, 2),
  backgroundColor: theme.palette.primary.light,
  borderRadius: theme.spacing(2),
  color: theme.palette.primary.contrastText,
  maxWidth: '80%',
  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
}));

const TypingDot = styled(motion.div)(({ theme }) => ({
  width: 8,
  height: 8,
  margin: '0 2px',
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.contrastText,
}));

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

// Typing animation component
const TypingAnimation: React.FC = () => {
  // Animation variants for the dots
  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -5 }
  };

  // Staggered transition for the dots
  const transition = {
    duration: 0.5,
    repeat: Infinity,
    repeatType: "reverse" as const,
    ease: "easeInOut"
  };

  // Get the active provider from Redux
  const providers = useAppSelector(state => state.ai.providers);
  const activeProvider = providers.find(p => p.isActive && p.isVerified);
  
  // Choose avatar based on provider
  const getAvatar = () => {
    if (activeProvider) {
      // Use provider-specific avatar
      switch (activeProvider.provider) {
        case 'openai':
          return <img src="/avatars/openai.png" alt="OpenAI" style={{ width: '100%', height: '100%' }} />;
        case 'gemini':
          return <img src="/avatars/gemini.png" alt="Gemini" style={{ width: '100%', height: '100%' }} onError={(e) => e.currentTarget.src = ''} />;
        case 'anthropic':
          return <img src="/avatars/anthropic.png" alt="Anthropic" style={{ width: '100%', height: '100%' }} />;
        default:
          return <BotIcon />;
      }
    } else {
      return <BotIcon />;
    }
  };

  return (
    <TypingContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      <AvatarContainer>
        <Avatar 
          sx={{ 
            width: 36, 
            height: 36,
            bgcolor: 'primary.main'
          }}
        >
          {getAvatar()}
        </Avatar>
      </AvatarContainer>
      <TypingBubble>
        <TypingDot
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{ ...transition, delay: 0 }}
        />
        <TypingDot
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{ ...transition, delay: 0.15 }}
        />
        <TypingDot
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{ ...transition, delay: 0.3 }}
        />
      </TypingBubble>
    </TypingContainer>
  );
};

export const AIAssistantPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingAnimationRef = useRef<HTMLDivElement>(null);
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
    
    // Then check messages for verification
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
    
    return result;
  }, [messages]);

  // Separate chat messages from notifications
  const chatMessages = useMemo(() => {
    // Include all messages from user and assistant, regardless of metadata type
    const filtered = filteredMessages.filter(m => {
      // Always include user and assistant messages in chat
      if (m.role === 'user' || m.role === 'assistant') {
        return true;
      }
      
      // Include messages explicitly marked as chat type
      if (m.metadata?.type === 'chat') {
        return true;
      }
      
      return false;
    });
    
    return filtered;
  }, [filteredMessages]);

  const notificationMessages = useMemo(() => {
    return filteredMessages.filter(m => 
      m.metadata?.type === 'notification' || 
      m.role === 'system'
    );
  }, [filteredMessages]);

  // Calculate counts
  const chatCount = useMemo(() => {
    return chatMessages.filter(m => !m.metadata?.read).length;
  }, [chatMessages]);

  const notificationCount = useMemo(() => {
    return notificationMessages.filter(m => !m.metadata?.read).length;
  }, [notificationMessages]);

  // Mark messages as read when tab is opened
  useEffect(() => {
    if (isOpen) {
      if (tabValue === 0) {
        // Mark chat messages as read
        chatMessages.forEach(msg => {
          if (!msg.metadata?.read) {
            markMessageAsRead(msg.id);
          }
        });
      } else if (tabValue === 1) {
        // Mark notification messages as read
        notificationMessages.forEach(msg => {
          if (!msg.metadata?.read) {
            markMessageAsRead(msg.id);
          }
        });
      }
    }
  }, [isOpen, tabValue, chatMessages, notificationMessages, markMessageAsRead]);

  // Auto-scroll to bottom when new messages arrive or when processing state changes
  useEffect(() => {
    scrollToBottom();
  }, [filteredMessages, isProcessing]);

  // Ensure the input is disabled when processing
  useEffect(() => {
    // This effect is just to make sure the component re-renders when isProcessing changes
    // The actual disabling logic is in the isInputEnabled memo
  }, [isProcessing]);

  // Auto-switch to notifications tab when verification messages arrive
  useEffect(() => {
    // Check if there are unread verification messages
    const hasUnreadVerificationMessages = notificationMessages.some(msg => 
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
  }, [notificationMessages, tabValue, isOpen]);

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
    // If processing, disable input
    if (isProcessing) {
      return false;
    }
    
    // If we have a verified provider, enable input regardless of connection status
    if (hasVerifiedProvider) {
      return true;
    }
    
    // Otherwise, only enable if connected
    return connectionStatus === 'connected';
  }, [hasVerifiedProvider, connectionStatus, isProcessing]);

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

  const handleSend = async () => {
    if (inputValue.trim() && !isProcessing) {
      try {
        await sendMessage(inputValue.trim());
        setInputValue('');
        // Scroll to bottom immediately when sending a message
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        logger.error('Error sending message:', error);
      }
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
              <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <MessageList>
                  <AnimatePresence initial={false}>
                    {chatMessages.length > 0 ? (
                      chatMessages.map((message) => (
                        <MessageItem 
                          key={message.id}
                          message={message}
                          onAnimationComplete={handleMessageAnimationComplete}
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', mt: 2 }}>
                        No messages yet
                      </Typography>
                    )}
                  </AnimatePresence>
                  
                  {/* Add typing animation when processing */}
                  <AnimatePresence>
                    {isProcessing && (
                      <motion.div 
                        ref={typingAnimationRef}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      >
                        <TypingAnimation key="typing-animation" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div ref={messagesEndRef} />
                </MessageList>
                <InputContainer>
                  <Box component="div" sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      placeholder={isProcessing ? "AI is thinking..." : "Type a message..."}
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
              </Box>
            </TabPanelComponent>

            <TabPanelComponent value={tabValue} index={1} isNotificationPanel={true}>
              <NotificationList>
                <AnimatePresence initial={false}>
                  {notificationMessages.length > 0 ? (
                    notificationMessages
                      .slice()
                      .sort((a, b) => {
                        // Sort by timestamp in descending order (newest first)
                        const timeA = a.metadata?.timestamp ? new Date(a.metadata.timestamp).getTime() : 0;
                        const timeB = b.metadata?.timestamp ? new Date(b.metadata.timestamp).getTime() : 0;
                        return timeB - timeA;
                      })
                      .map((message) => (
                        <MessageItem
                          key={message.id}
                          message={message}
                          onAnimationComplete={handleMessageAnimationComplete}
                        />
                      ))
                  ) : (
                    <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', mt: 2 }}>
                      No notifications yet
                    </Typography>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </NotificationList>
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