import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Fab,
  Paper,
  TextField,
  IconButton,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Slide,
  Badge,
  useTheme,
  alpha,
  Zoom,
  keyframes,
  SvgIcon,
  Button,
  Stack
} from '@mui/material';
import {
  Chat as ChatIcon,
  Send as SendIcon,
  Close as CloseIcon,
  NotificationsOutlined,
  ChatOutlined,
  AnalyticsOutlined,
  LightbulbOutlined,
  Terminal,
  Person as PersonIcon,
  SmartToy as BotIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useAIMessages } from '../contexts/AIMessagesContext';
import { AIMessage, AIMessageMetadata } from '@admin-ai/shared/src/types/ai';
import { wsService } from '../services/websocket.service';
import { AIStatusAlert } from './AIStatusAlert';

// Define typing animation keyframes
const typeAnimation = keyframes`
  from {
    width: 0;
    opacity: 0;
  }
  to {
    width: 100%;
    opacity: 1;
  }
`;

const pulseAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
`;

const slideIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
    perspective: 1000px;
    transform-style: preserve-3d;
  }
  50% {
    opacity: 0.5;
    transform: translateY(10px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const popAnimation = keyframes`
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
`;

const floatAnimation = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0px); }
`;

const panelSlideIn = keyframes`
  0% {
    opacity: 0;
    transform: translate3d(0, 100px, -50px) scale(0.8);
    perspective: 1000px;
  }
  50% {
    opacity: 0.8,
    transform: translate3d(0, 30px, -20px) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
`;

// Enhanced badge animation keyframes
const badgeAnimation = keyframes`
  0% { transform: scale(0) rotate(-45deg); opacity: 0; }
  50% { transform: scale(1.2) rotate(10deg); }
  75% { transform: scale(0.9) rotate(-5deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

const notificationSlideIn = keyframes`
  0% {
    opacity: 0;
    transform: translate3d(100%, 0, -50px) scale(0.8);
    perspective: 1000px;
  }
  50% {
    opacity: 0.8;
    transform: translate3d(20%, 0, -20px) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
`;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`ai-tabpanel-${index}`}
      aria-labelledby={`ai-tab-${index}`}
      sx={{ flex: 1, overflow: 'auto' }}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </Box>
  );
};

const typeIcons = {
  notification: NotificationsOutlined,
  chat: ChatOutlined,
  analysis: AnalyticsOutlined,
  suggestion: LightbulbOutlined,
  command: Terminal,
} as const;

const statusColors = {
  success: 'success',
  error: 'error',
  info: 'info',
  warning: 'warning',
} as const;

interface MessageProps {
  message: AIMessage;
  onAnimationComplete: () => void;
}

const Message: React.FC<MessageProps> = ({ message, onAnimationComplete }) => {
  const theme = useTheme();
  const [isTyping, setIsTyping] = useState(true);
  const [displayedText, setDisplayedText] = useState('');
  const isAI = message.role === 'assistant';
  const isNotification = message.metadata?.type === 'notification';
  const isChat = message.metadata?.type === 'chat' || !message.metadata?.type;

  useEffect(() => {
    let currentChar = 0;
    const text = message.content;
    const typingSpeed = 30;
    let typingInterval: NodeJS.Timeout;

    if (isAI && !message.metadata?.read && !isNotification) {
      setDisplayedText('');
      setIsTyping(true);
      typingInterval = setInterval(() => {
        if (currentChar < text.length) {
          setDisplayedText(text.slice(0, currentChar + 1));
          currentChar++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
          onAnimationComplete();
        }
      }, typingSpeed);

      return () => {
        clearInterval(typingInterval);
      };
    } else {
      setDisplayedText(text);
      setIsTyping(false);
      if (!message.metadata?.read) {
        onAnimationComplete();
      }
    }
  }, [message.id, message.content, onAnimationComplete, isAI, isNotification, message.metadata?.read]);

  const getNotificationIcon = (type: string, color: string, fontSize: number) => {
    switch (type) {
      case 'notification':
        return <NotificationsOutlined sx={{ color, fontSize }} />;
      case 'chat':
        return <ChatOutlined sx={{ color, fontSize }} />;
      case 'analysis':
        return <AnalyticsOutlined sx={{ color, fontSize }} />;
      case 'suggestion':
        return <LightbulbOutlined sx={{ color, fontSize }} />;
      case 'command':
        return <Terminal sx={{ color, fontSize }} />;
      default:
        return <NotificationsOutlined sx={{ color, fontSize }} />;
    }
  };

  // Notification message
  if (isNotification) {
    const statusColor = statusColors[message.metadata?.status || 'info'];
    const notificationStyle = {
      color: theme.palette[statusColor].main,
      background: alpha(theme.palette[statusColor].main, 0.05),
    };

    return (
      <Box
        sx={{
          mb: 2,
          width: '100%',
          animation: `${notificationSlideIn} 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)`,
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            p: 2,
            borderRadius: 2,
            backgroundColor: notificationStyle.background,
            border: `1px solid ${alpha(notificationStyle.color, 0.1)}`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2,
            backdropFilter: 'blur(8px)',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: 'translate3d(0, 0, 0)',
            '&:hover': {
              transform: 'translate3d(4px, -2px, 10px)',
              boxShadow: `0 8px 16px ${alpha(notificationStyle.color, 0.15)}`,
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              backgroundColor: notificationStyle.color,
              borderRadius: '4px 0 0 4px',
              boxShadow: `0 0 10px ${alpha(notificationStyle.color, 0.3)}`,
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {message.metadata?.style?.icon ? (
              <Typography
                variant="body1"
                sx={{
                  color: notificationStyle.color,
                  fontSize: '1.5rem',
                  lineHeight: 1,
                }}
              >
                {message.metadata.style.icon}
              </Typography>
            ) : (
              getNotificationIcon(
                message.metadata?.type || 'notification',
                notificationStyle.color,
                24
              )
            )}
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: notificationStyle.color,
                animation: `${pulseAnimation} 2s infinite`,
              }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 500,
                  color: notificationStyle.color,
                }}
              >
                {message.metadata?.status?.toUpperCase() || 'NOTIFICATION'}
              </Typography>
              {message.metadata?.category && (
                <Typography
                  variant="caption"
                  sx={{
                    backgroundColor: alpha(notificationStyle.color, 0.1),
                    color: notificationStyle.color,
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {message.metadata.category}
                </Typography>
              )}
            </Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {message.content}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mt: 1,
              }}
            >
              <Typography 
                variant="caption" 
                sx={{ color: alpha(theme.palette.text.secondary, 0.8) }}
              >
                {message.metadata?.timestamp ? new Date(message.metadata.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
              </Typography>
              {message.metadata?.actions && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {message.metadata.actions.map((action, index) => (
                    <Button
                      key={index}
                      size="small"
                      variant="text"
                      sx={{ color: notificationStyle.color }}
                      onClick={() => {/* Handle action */}}
                    >
                      {action.label}
                    </Button>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Chat message
  return (
    <Box
      sx={{
        mb: 2,
        animation: `${slideIn} 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: isAI ? 'flex-start' : 'flex-end',
        width: '100%',
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
    >
      <Box
        sx={{
          maxWidth: '75%',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
        }}
      >
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: isAI 
              ? alpha(theme.palette.primary.main, 0.05)
              : alpha(theme.palette.secondary.main, 0.05),
            position: 'relative',
            border: `1px solid ${alpha(
              isAI ? theme.palette.primary.main : theme.palette.secondary.main,
              0.1
            )}`,
            backdropFilter: 'blur(8px)',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: 'translate3d(0, 0, 0)',
            '&:hover': {
              transform: isAI 
                ? 'translate3d(4px, -2px, 10px)'
                : 'translate3d(-4px, -2px, 10px)',
              boxShadow: `0 8px 16px ${alpha(
                isAI ? theme.palette.primary.main : theme.palette.secondary.main,
                0.15
              )}`,
            },
          }}
        >
          <Typography 
            variant="body2"
            sx={{
              ...(isAI && isTyping && {
                '&::after': {
                  content: '"|"',
                  marginLeft: 1,
                  animation: `${pulseAnimation} 1s infinite`,
                  opacity: 0.7,
                  color: theme.palette.primary.main,
                }
              })
            }}
          >
            {isAI ? displayedText : message.content}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            ml: isAI ? 0 : 'auto',
            mr: isAI ? 'auto' : 0,
            opacity: 0.8,
            transition: 'opacity 0.2s ease-in-out',
            '&:hover': {
              opacity: 1,
            }
          }}
        >
          {isAI ? (
            <BotIcon sx={{ fontSize: 16, color: theme.palette.primary.main }} />
          ) : (
            <PersonIcon sx={{ fontSize: 16, color: theme.palette.secondary.main }} />
          )}
          <Typography variant="caption" color="text.secondary">
            {message.metadata?.timestamp ? new Date(message.metadata.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

interface MessageBoxProps {
  role: 'user' | 'assistant';
  content: string;
}

const MessageBox: React.FC<MessageBoxProps> = ({ role, content }) => (
  <Box
    sx={{
      alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
      maxWidth: '80%',
      padding: 3,
      borderRadius: 2,
      backgroundColor: role === 'user' ? 'primary.main' : 'grey.100',
      color: role === 'user' ? 'common.white' : 'text.primary'
    }}
  >
    <Typography>{content}</Typography>
  </Box>
);

interface SendButtonProps {
  isDisabled: boolean;
}

const SendButton: React.FC<SendButtonProps> = ({ isDisabled }) => (
  <IconButton
    type="submit"
    color="primary"
    disabled={isDisabled}
    aria-label="Send message"
  >
    <SendIcon />
  </IconButton>
);

interface AIMessageType {
  id?: string;
  content: string;
  role: 'user' | 'assistant';
  metadata?: {
    timestamp: string;
    type?: string;
    status?: 'success' | 'error' | 'info' | 'warning';
    category?: string;
    read?: boolean;
    style?: {
      icon?: string;
    };
    actions?: Array<{
      label: string;
      onClick?: () => void;
    }>;
  };
}

export const AIAssistantPanel: React.FC = () => {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, markMessageAsRead } = useAIMessages();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    await sendMessage(inputMessage);
    setInputMessage('');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const messageCategories = {
    chat: messages.filter(m => m.metadata?.type === 'chat' || !m.metadata?.type),
    all: messages,
    system: messages.filter(m => m.role === 'system'),
    alerts: messages.filter(m => m.metadata?.status === 'error' || m.metadata?.status === 'warning')
  };

  const getBadgeCount = (category: keyof typeof messageCategories) => {
    return messageCategories[category].filter(m => !m.metadata?.read).length;
  };

  return (
    <>
      <Fab
        color="primary"
        aria-label="ai-assistant"
        onClick={() => setIsOpen(!isOpen)}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000
        }}
      >
        <Badge badgeContent={getBadgeCount('all')} color="error">
          <ChatIcon />
        </Badge>
      </Fab>

      <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            width: 360,
            height: 500,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">AI Assistant</Typography>
              <IconButton onClick={() => setIsOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Stack>
            <AIStatusAlert />
          </Box>

          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
              <Tab 
                icon={<ChatIcon />} 
                label="Chat"
              />
              <Tab 
                icon={
                  <Badge badgeContent={getBadgeCount('all')} color="error">
                    <NotificationsOutlined />
                  </Badge>
                }
                label="All"
              />
              <Tab 
                icon={
                  <Badge badgeContent={getBadgeCount('system')} color="error">
                    <Terminal />
                  </Badge>
                }
                label="System"
              />
              <Tab 
                icon={
                  <Badge badgeContent={getBadgeCount('alerts')} color="error">
                    <AnalyticsOutlined />
                  </Badge>
                }
                label="Alerts"
              />
            </Tabs>

            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {Object.entries(messageCategories).map(([category, msgs], index) => (
                <TabPanel key={category} value={tabValue} index={index}>
                  {msgs.map((message, i) => (
                    <Message
                      key={message.id || i}
                      message={message}
                      onAnimationComplete={() => markMessageAsRead(message.id)}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </TabPanel>
              ))}
            </Box>

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{
                p: 2,
                borderTop: 1,
                borderColor: 'divider',
                backgroundColor: theme.palette.background.paper
              }}
            >
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message..."
                  variant="outlined"
                />
                <IconButton
                  type="submit"
                  color="primary"
                  disabled={!inputMessage.trim()}
                >
                  <SendIcon />
                </IconButton>
              </Stack>
            </Box>
          </Box>
        </Paper>
      </Slide>
    </>
  );
}; 