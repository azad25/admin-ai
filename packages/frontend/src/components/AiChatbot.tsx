import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
} from '@mui/material';
import { useSocket } from '../contexts/SocketContext';
import { AIMessage } from '@admin-ai/shared/types/ai';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface MessageProps {
  message: AIMessage;
}

const AiChatbot: React.FC = () => {
  const { messages, sendMessage, loading: isProcessing } = useSocket();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messageCategories = {
    notification: 'Notifications',
    chat: 'Chat',
    analysis: 'Analysis',
    suggestion: 'Suggestions',
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const renderMessage = (message: AIMessage) => {
    const isAI = message.role === 'assistant';

    return (
      <Box
        key={message.id}
        sx={{
          display: 'flex',
          flexDirection: isAI ? 'row' : 'row-reverse',
          mb: 2,
          alignItems: 'flex-start',
        }}
      >
        <Avatar
          sx={{
            bgcolor: isAI ? 'primary.main' : 'secondary.main',
            mr: isAI ? 1 : 0,
            ml: isAI ? 0 : 1,
          }}
        >
          {isAI ? 'AI' : 'U'}
        </Avatar>
        <Box
          sx={{
            maxWidth: '80%',
            p: 2,
            borderRadius: 2,
            bgcolor: isAI ? 'primary.light' : 'secondary.light',
            color: isAI ? 'primary.contrastText' : 'secondary.contrastText',
            position: 'relative',
          }}
        >
          <Typography variant="body1">{message.content}</Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: 3,
      }}
    >
      <Box
        sx={{
          p: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6">AI Assistant</Typography>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          p: 2,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.map(renderMessage)}
        <div ref={messagesEndRef} />
      </Box>

      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage(input);
            setInput('');
          }
        }}
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (input.trim()) {
                sendMessage(input);
                setInput('');
              }
            }
          }}
          disabled={isProcessing}
          sx={{ mr: 1 }}
        />
        <IconButton
          type="submit"
          color="primary"
          disabled={!input.trim() || isProcessing}
        >
          Send
        </IconButton>
      </Box>
    </Box>
  );
};

export default AiChatbot;
