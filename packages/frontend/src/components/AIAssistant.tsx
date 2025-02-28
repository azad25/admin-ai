import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { styled } from '@mui/material/styles';
import { Box, Paper, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { AIMessage } from '@admin-ai/shared/src/types/ai';

const AssistantPanel = styled(motion(Paper))(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(2),
  right: theme.spacing(2),
  width: 400,
  height: 600,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  zIndex: 1000,
  borderRadius: theme.spacing(2),
  boxShadow: theme.shadows[10]
}));

const Header = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: `1px solid ${theme.palette.divider}`
}));

const ChatContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2)
}));

const MessageBubble = styled(Box, {
  shouldForwardProp: prop => prop !== 'isAI'
})<{ isAI?: boolean }>(({ theme, isAI }) => ({
  maxWidth: '80%',
  padding: theme.spacing(1.5),
  borderRadius: theme.spacing(2),
  alignSelf: isAI ? 'flex-start' : 'flex-end',
  backgroundColor: isAI ? theme.palette.primary.light : theme.palette.secondary.light,
  color: theme.palette.getContrastText(isAI ? theme.palette.primary.light : theme.palette.secondary.light)
}));

const LoadingDots = styled(motion.div)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(0.5),
  '& span': {
    width: 8,
    height: 8,
    backgroundColor: theme.palette.primary.main,
    borderRadius: '50%'
  }
}));

interface AIAssistantProps {
  messages: AIMessage[];
  isLoading?: boolean;
  onClose: () => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ messages, isLoading, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleShow = (event: CustomEvent) => {
      setIsVisible(true);
    };

    window.addEventListener('show-ai-assistant' as any, handleShow);
    return () => {
      window.removeEventListener('show-ai-assistant' as any, handleShow);
    };
  }, []);

  const loadingAnimation = {
    animate: {
      y: [0, -5, 0],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        repeatType: "reverse" as const,
        ease: "easeInOut" as const,
        staggerChildren: 0.2
      }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <AssistantPanel
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
        >
          <Header>
            <Box display="flex" alignItems="center" gap={1}>
              <img src="/gemini-icon.png" alt="Gemini AI" width={24} height={24} />
              <Typography variant="h6">AI Assistant</Typography>
            </Box>
            <IconButton onClick={() => {
              setIsVisible(false);
              onClose();
            }}>
              <CloseIcon />
            </IconButton>
          </Header>

          <ChatContainer>
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id || index}
                isAI={message.role === 'assistant'}
                component={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Typography>{message.content}</Typography>
              </MessageBubble>
            ))}

            {isLoading && (
              <Box display="flex" alignItems="center" gap={1} ml={2}>
                <img src="/gemini-icon.png" alt="Gemini AI" width={16} height={16} />
                <LoadingDots {...loadingAnimation}>
                  <motion.span {...loadingAnimation} />
                  <motion.span {...loadingAnimation} />
                  <motion.span {...loadingAnimation} />
                </LoadingDots>
              </Box>
            )}
          </ChatContainer>
        </AssistantPanel>
      )}
    </AnimatePresence>
  );
}; 