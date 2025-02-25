import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Fab,
  Paper,
  TextField,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  Collapse,
  CircularProgress,
  Slide
} from '@mui/material';
import {
  Chat as ChatIcon,
  Send as SendIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { AIMessage } from '@admin-ai/shared/src/types/ai';
import axios from 'axios';

export const AIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    try {
      setLoading(true);
      const userMessage: AIMessage = {
        id: Date.now().toString(),
        content: input,
        role: 'user',
        metadata: { 
          type: 'chat',
          timestamp: Date.now()
        }
      };
      setMessages(prev => [...prev, userMessage]);
      setInput('');

      const response = await axios.post('/api/ai/message', {
        content: input,
        role: 'user'
      });

      setMessages(prev => [...prev, response.data]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message to chat
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'system',
        timestamp: new Date(),
        metadata: { 
          type: 'chat',
          status: 'error',
          timestamp: Date.now()
        }
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <Fab
        color="primary"
        aria-label="chat"
        onClick={() => setIsOpen(!isOpen)}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000
        }}
      >
        <ChatIcon />
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
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: 1,
              borderColor: 'divider'
            }}
          >
            <Typography variant="h6">AI Assistant</Typography>
            <IconButton onClick={() => setIsOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <List
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 2,
              bgcolor: 'background.default'
            }}
          >
            {messages.map((message) => (
              <ListItem
                key={message.id}
                sx={{
                  flexDirection: 'column',
                  alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                  p: 1
                }}
              >
                <Paper
                  sx={{
                    p: 1,
                    maxWidth: '80%',
                    bgcolor: message.role === 'user' ? 'primary.main' : 'background.paper',
                    color: message.role === 'user' ? 'primary.contrastText' : 'text.primary'
                  }}
                >
                  <Typography variant="body2">{message.content}</Typography>
                </Paper>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  {new Date(message.metadata.timestamp).toLocaleTimeString()}
                </Typography>
              </ListItem>
            ))}
            <div ref={messagesEndRef} />
          </List>

          <Box
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}
          >
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              inputRef={inputRef}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    color="primary"
                  >
                    {loading ? <CircularProgress size={24} /> : <SendIcon />}
                  </IconButton>
                )
              }}
            />
          </Box>
        </Paper>
      </Slide>
    </>
  );
}; 