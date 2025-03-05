import React, { useRef } from 'react';
import { Box, Typography, Paper, Avatar } from '@mui/material';
import {
  Person as PersonIcon,
  SmartToy as BotIcon,
  CheckCircleOutline as SuccessIcon,
  ErrorOutline as ErrorIcon,
  InfoOutlined as InfoIcon,
  WarningAmberOutlined as WarningIcon,
} from '@mui/icons-material';
import { AIMessage } from '@admin-ai/shared/types/ai';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

type StatusType = 'success' | 'error' | 'info' | 'warning';

interface StatusColor {
  light: string;
  main: string;
  contrastText: string;
}

const statusColors: Record<StatusType, StatusColor> = {
  success: { light: '#e8f5e9', main: '#4caf50', contrastText: '#1b5e20' },
  error: { light: '#ffebee', main: '#f44336', contrastText: '#b71c1c' },
  info: { light: '#e3f2fd', main: '#2196f3', contrastText: '#0d47a1' },
  warning: { light: '#fff8e1', main: '#ff9800', contrastText: '#e65100' },
};

const statusIcons: Record<StatusType, React.ReactNode> = {
  success: <SuccessIcon color="success" />,
  error: <ErrorIcon color="error" />,
  info: <InfoIcon color="info" />,
  warning: <WarningIcon color="warning" />,
};

// Use transient props to prevent passing isAI to DOM
const MessageContainer = styled(Box, {
  shouldForwardProp: prop => prop !== 'isAI'
})<{ isAI?: boolean }>(({ theme, isAI }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: isAI ? 'flex-start' : 'flex-end',
  width: '100%',
  marginBottom: theme.spacing(1),
}));

const NotificationBox = styled(Paper, {
  shouldForwardProp: prop => prop !== 'status'
})<{ status?: StatusType }>(({ theme, status = 'info' }) => ({
  backgroundColor: statusColors[status].light,
  color: statusColors[status].contrastText,
  padding: theme.spacing(1.5),
  borderRadius: theme.spacing(1.5),
  width: '100%',
  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '4px',
    backgroundColor: statusColors[status].main,
  }
}));

const ChatContainer = styled('div')<{ isAI?: boolean }>(({ theme, isAI }) => ({
  display: 'flex',
  flexDirection: isAI ? 'row' : 'row-reverse',
  alignItems: 'flex-start',
  gap: theme.spacing(1),
  width: '100%',
  marginBottom: theme.spacing(0.5),
}));

const ChatMessageBox = styled('div')<{ isAI?: boolean }>(({ theme, isAI }) => ({
  backgroundColor: isAI ? theme.palette.primary.light : theme.palette.secondary.light,
  color: isAI ? theme.palette.primary.contrastText : theme.palette.secondary.contrastText,
  padding: theme.spacing(1, 2),
  borderRadius: theme.spacing(2),
  maxWidth: '100%',
  position: 'relative',
}));

const MessageContent = styled(Typography)({
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
});

const NotificationHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: theme.spacing(1),
}));

const NotificationTitle = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const NotificationTime = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
}));

const MessageTime = styled(Typography)(({ theme }) => ({
  fontSize: '0.7rem',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  textAlign: 'right',
}));

const AvatarContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
});

const MessageContentContainer = styled('div')({
  maxWidth: '80%',
});

// Animation variants for the message container
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -10 }
};

const NotificationMessage: React.FC<{ message: AIMessage }> = ({ message }) => {
  const status = (message.metadata?.status as StatusType) || 'info';
  const timestamp = message.timestamp ? new Date(message.timestamp) : new Date();
  const formattedTime = format(timestamp, 'h:mm a');
  
  // Get source information if available
  const source = message.metadata?.source;
  const sourceText = source ? 
    `${source.page || ''}${source.controller ? ' > ' + source.controller : ''}${source.action ? ' > ' + source.action : ''}` 
    : 'System';
  
  return (
    <NotificationBox status={status}>
      <NotificationHeader>
        <NotificationTitle>
          {statusIcons[status]}
          <Typography variant="subtitle2">
            {sourceText}
          </Typography>
        </NotificationTitle>
        <NotificationTime>{formattedTime}</NotificationTime>
      </NotificationHeader>
      
      <MessageContent variant="body2">{message.content}</MessageContent>
    </NotificationBox>
  );
};

const ChatMessage: React.FC<{ message: AIMessage }> = ({ message }) => {
  const isAI = message.role === 'assistant';
  const timestamp = message.timestamp ? new Date(message.timestamp) : new Date();
  const formattedTime = format(timestamp, 'h:mm a');
  
  // Get provider information if available
  const provider = message.metadata?.provider || 'unknown';
  
  // Choose avatar based on role and provider
  const getAvatar = () => {
    if (isAI) {
      // Use provider-specific avatar for AI
      switch (provider) {
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
      // Use user avatar for user messages
      return <PersonIcon />;
    }
  };

  return (
    <MessageContainer isAI={isAI}>
      <ChatContainer isAI={isAI}>
        <AvatarContainer>
          <Avatar 
            sx={{ 
              width: 36, 
              height: 36,
              bgcolor: isAI ? 'primary.main' : 'secondary.main'
            }}
          >
            {getAvatar()}
          </Avatar>
        </AvatarContainer>
        <MessageContentContainer>
          <ChatMessageBox isAI={isAI}>
            <MessageContent>{message.content}</MessageContent>
          </ChatMessageBox>
          <MessageTime>{formattedTime}</MessageTime>
        </MessageContentContainer>
      </ChatContainer>
    </MessageContainer>
  );
};

interface AIMessageComponentProps {
  message: AIMessage;
  onAnimationComplete?: (id: string) => void;
}

export const AIMessageComponent: React.FC<AIMessageComponentProps> = ({
  message,
  onAnimationComplete,
}) => {
  const isNotification = message.metadata?.type === 'notification';
  const messageId = message.id || '';
  const animationRef = useRef(false);

  const handleAnimationComplete = () => {
    if (!animationRef.current && onAnimationComplete) {
      animationRef.current = true;
      onAnimationComplete(messageId);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={containerVariants}
      transition={{ duration: 0.3 }}
      onAnimationComplete={handleAnimationComplete}
    >
      <MessageContainer>
        {isNotification ? (
          <NotificationMessage message={message} />
        ) : (
          <ChatMessage message={message} />
        )}
      </MessageContainer>
    </motion.div>
  );
}; 