import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Fab,
  Zoom,
  CircularProgress,
  useTheme,
  Badge,
  Tabs,
  Tab,
  Card,
  CardContent,
  alpha,
  Avatar,
  Chip,
  Button,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as ChatbotIcon,
  Close as CloseIcon,
  Chat as ChatIcon,
  Notifications as NotificationsIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../contexts/SocketContext';
import type { AIMessage, LLMProvider } from '@admin-ai/shared/src/types/ai';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  const theme = useTheme();
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`assistant-tabpanel-${index}`}
      aria-labelledby={`assistant-tab-${index}`}
      sx={{ 
        flex: 1, 
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: theme => alpha(theme.palette.primary.main, 0.2),
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: theme => alpha(theme.palette.primary.main, 0.3),
        },
      }}
      {...other}
    >
      {value === index && children}
    </Box>
  );
};

const menuVariants = {
  closed: {
    opacity: 0,
    scale: 0.3,
    y: 50,
    x: 28,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  open: {
    opacity: 1,
    scale: 1,
    y: -460,
    x: -152,
    transition: {
      duration: 0.4,
      ease: [0, 0, 0.2, 1]
    }
  }
};

const fabVariants = {
  closed: {
    scale: 1,
    rotate: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  open: {
    scale: 1,
    rotate: 45,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

interface MessageProps {
  message: AIMessage;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const theme = useTheme();
  const isUser = message.role === 'user';

  const getProviderIcon = (provider?: LLMProvider) => {
    switch (provider) {
      case 'openai':
        return '🤖';
      case 'gemini':
        return '🧠';
      case 'anthropic':
        return '🌟';
      default:
        return '💬';
    }
  };

  const getAvatarContent = () => {
    if (isUser) {
      return '👤';
    }
    return message.metadata?.provider ? getProviderIcon(message.metadata.provider) : '🤖';
  };

  if (!message.role) return null;

  return (
    <Box
      sx={{
        mb: 2,
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 1,
      }}
    >
      <Avatar
        sx={{
          bgcolor: isUser ? theme.palette.primary.main : theme.palette.background.paper,
          color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
          width: 32,
          height: 32,
          border: `2px solid ${theme.palette.primary.main}`,
          boxShadow: theme.shadows[2],
        }}
      >
        {getAvatarContent()}
      </Avatar>
      <Box
        sx={{
          maxWidth: '70%',
          p: 2,
          bgcolor: isUser ? theme.palette.primary.main : theme.palette.background.paper,
          color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
          borderRadius: 2,
          boxShadow: theme.shadows[1],
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '50%',
            [isUser ? 'right' : 'left']: -6,
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderWidth: '6px 6px 6px 0',
            borderColor: `transparent ${isUser ? theme.palette.primary.main : theme.palette.background.paper} transparent transparent`,
            transform: isUser ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
          },
        }}
      >
        <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message.content}
        </Typography>
        {!isUser && message.metadata?.model && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: 'block' }}
          >
            Using {message.metadata.model}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export const AiChatbot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, loading, sendMessage, markAllMessagesAsRead } = useSocket();
  const theme = useTheme();

  const categorizeMessages = (messages: AIMessage[]) => {
    const chatMsgs = messages.filter(msg => msg.metadata.type === 'chat');
    const nonChatMsgs = messages.filter(msg => msg.metadata.type !== 'chat');
    const systemMsgs = messages.filter(msg => 
      msg.metadata.type !== 'chat' && 
      (msg.metadata.category === 'system' || msg.role === 'system')
    );
    const alertMsgs = messages.filter(msg => 
      msg.metadata.type !== 'chat' && 
      (msg.metadata.category === 'alert' || msg.metadata.status === 'error' || msg.metadata.status === 'warning')
    );

    return {
      chat: chatMsgs,
      all: nonChatMsgs,
      system: systemMsgs,
      alerts: alertMsgs
    };
  };

  const [messageCategories, setMessageCategories] = useState(categorizeMessages(messages));
  const [notificationHistory, setNotificationHistory] = useState<AIMessage[]>([]);
  const unreadCount = messages.filter(msg => !msg.metadata.read).length;

  useEffect(() => {
    setMessageCategories(categorizeMessages(messages));
    // Update notification history
    const notifications = messages.filter(msg => 
      msg.metadata.type === 'notification' || 
      (msg.metadata.type !== 'chat' && msg.role === 'system')
    );
    setNotificationHistory(notifications);
  }, [messages]);

  const getNotificationCount = (category: string) => {
    return notificationHistory.filter(msg => 
      msg.metadata.category === category && 
      !msg.metadata.read
    ).length;
  };

  const getBadgeCount = (category?: keyof typeof messageCategories) => {
    if (!category) {
      return notificationHistory.filter(msg => !msg.metadata.read).length;
    }
    if (category === 'all') {
      return notificationHistory.filter(msg => !msg.metadata.read).length;
    }
    if (category === 'system') {
      return getNotificationCount('system');
    }
    if (category === 'alerts') {
      return notificationHistory.filter(msg => 
        (msg.metadata.category === 'alert' || 
         msg.metadata.status === 'error' || 
         msg.metadata.status === 'warning') && 
        !msg.metadata.read
      ).length;
    }
    return messageCategories[category].filter(msg => !msg.metadata.read).length;
  };

  const renderNotificationTab = (messages: AIMessage[]) => (
    <Box sx={{ height: 'calc(100vh - 240px)', maxHeight: '380px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box 
        sx={{ 
          p: 2, 
          flexGrow: 1, 
          overflowY: 'auto',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: theme => alpha(theme.palette.primary.main, 0.2),
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: theme => alpha(theme.palette.primary.main, 0.3),
          },
        }}
      >
        {messages.map((message: AIMessage) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {renderNotification(message)}
          </motion.div>
        ))}
      </Box>
    </Box>
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messageCategories.chat]);

  useEffect(() => {
    if (open) {
      markAllMessagesAsRead();
    }
  }, [open, markAllMessagesAsRead]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    try {
      await sendMessage(input);
      setInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const renderNotification = (message: AIMessage) => {
    const category = message.metadata.category || 'info';
    const statusColor = message.metadata.status || 'info';
    const timestamp = new Date(message.metadata.timestamp).toLocaleTimeString();

    const getNotificationIcon = () => {
      switch (category) {
        case 'system':
          return <InfoIcon fontSize="small" />;
        case 'alert':
          return <WarningIcon fontSize="small" />;
        case 'success':
          return <CheckCircleIcon fontSize="small" />;
        case 'error':
          return <ErrorIcon fontSize="small" />;
        default:
          return <NotificationsIcon fontSize="small" />;
      }
    };

    return (
      <Card
        sx={{
          mb: 2,
          bgcolor: alpha(theme.palette[statusColor].main, 0.05),
          border: `1px solid ${alpha(theme.palette[statusColor].main, 0.1)}`,
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ color: theme.palette[statusColor].main }}>
              {getNotificationIcon()}
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body1">{message.content}</Typography>
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                {message.metadata.category && (
                  <Chip 
                    label={message.metadata.category} 
                    size="small" 
                    color={statusColor as any}
                    variant="outlined"
                  />
                )}
                <Typography variant="caption" color="text.secondary">
                  {timestamp}
                </Typography>
              </Box>
              {message.metadata.actions && message.metadata.actions.length > 0 && (
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  {message.metadata.actions.map((action, index) => (
                    <Button
                      key={index}
                      size="small"
                      variant="outlined"
                      color={statusColor as any}
                      onClick={() => handleNotificationAction(action)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const handleNotificationAction = (action: { label: string; action: string; data?: any }) => {
    // Handle notification actions here
    console.log('Notification action:', action);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: theme.spacing(2),
        right: theme.spacing(2),
        zIndex: theme.zIndex.drawer + 2,
      }}
    >
      <motion.div
        initial="closed"
        animate={open ? "open" : "closed"}
        variants={fabVariants}
      >
        <Fab
          color="primary"
          onClick={() => setOpen(!open)}
          sx={{
            width: 56,
            height: 56,
            boxShadow: theme.shadows[8],
          }}
        >
          <Badge badgeContent={getBadgeCount()} color="error" overlap="circular">
            {open ? <CloseIcon /> : <ChatbotIcon />}
          </Badge>
        </Fab>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="menu"
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 360,
              height: 500,
              backgroundColor: theme.palette.background.paper,
              borderRadius: 8,
              boxShadow: theme.shadows[24],
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              transformOrigin: 'bottom right',
            }}
          >
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
                <Tab 
                  icon={<ChatIcon />} 
                  label="Chat" 
                  id="assistant-tab-0"
                  aria-controls="assistant-tabpanel-0"
                />
                <Tab 
                  icon={
                    <Badge badgeContent={getBadgeCount('all')} color="error">
                      <NotificationsIcon />
                    </Badge>
                  }
                  label="All" 
                  id="assistant-tab-1"
                  aria-controls="assistant-tabpanel-1"
                />
                <Tab 
                  icon={
                    <Badge badgeContent={getBadgeCount('system')} color="error">
                      <InfoIcon />
                    </Badge>
                  }
                  label="System" 
                  id="assistant-tab-2"
                  aria-controls="assistant-tabpanel-2"
                />
                <Tab 
                  icon={
                    <Badge badgeContent={getBadgeCount('alerts')} color="error">
                      <WarningIcon />
                    </Badge>
                  }
                  label="Alerts" 
                  id="assistant-tab-3"
                  aria-controls="assistant-tabpanel-3"
                />
              </Tabs>
            </Box>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                height: 'calc(100% - 48px)',
                overflow: 'hidden'
              }}
            >
              <TabPanel value={tabValue} index={0}>
                <Box 
                  sx={{ 
                    height: 'calc(100vh - 240px)', 
                    maxHeight: '380px',
                    display: 'flex', 
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}
                >
                  <Box 
                    sx={{ 
                      p: 2, 
                      flexGrow: 1, 
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      '&::-webkit-scrollbar': {
                        width: '8px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: 'transparent',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: theme => alpha(theme.palette.primary.main, 0.2),
                        borderRadius: '4px',
                      },
                      '&::-webkit-scrollbar-thumb:hover': {
                        background: theme => alpha(theme.palette.primary.main, 0.3),
                      },
                    }}
                  >
                    {messageCategories.chat.map((message: AIMessage) => (
                      <Message key={message.id} message={message} />
                    ))}
                    <div ref={messagesEndRef} />
                  </Box>
                </Box>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                {renderNotificationTab(notificationHistory)}
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                {renderNotificationTab(notificationHistory.filter(msg => 
                  msg.metadata.category === 'system' || msg.role === 'system'
                ))}
              </TabPanel>

              <TabPanel value={tabValue} index={3}>
                {renderNotificationTab(notificationHistory.filter(msg => 
                  msg.metadata.category === 'alert' || 
                  msg.metadata.status === 'error' || 
                  msg.metadata.status === 'warning'
                ))}
              </TabPanel>
            </motion.div>

            {tabValue === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Box
                  component="form"
                  onSubmit={handleSubmit}
                  sx={{
                    p: 2,
                    borderTop: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={loading}
                    InputProps={{
                      endAdornment: (
                        <IconButton
                          onClick={handleSend}
                          disabled={!input.trim() || loading}
                          color="primary"
                        >
                          {loading ? <CircularProgress size={24} /> : <SendIcon />}
                        </IconButton>
                      ),
                      sx: {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'transparent',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'transparent',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'transparent',
                        },
                      },
                    }}
                    sx={{
                      bgcolor: theme.palette.action.hover,
                      borderRadius: 2,
                    }}
                  />
                </Box>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}; 