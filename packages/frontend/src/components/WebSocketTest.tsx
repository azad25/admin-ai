import React, { useEffect, useState } from 'react';
import { getWebSocketService } from '../services/websocket.service';
import { Button, Card, CardContent, Typography, Box, Alert, Chip, Stack, TextField } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { logger } from '../utils/logger';

const WebSocketTest: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState('Hello from WebSocket test!');
  const { user } = useAuth();
  const wsService = getWebSocketService();

  useEffect(() => {
    // Check initial connection status
    setConnected(wsService.isConnected());
    setSocketId(wsService.getSocketId());

    // Set up event listeners
    const handleConnect = () => {
      logger.info('WebSocket connected in test component');
      setConnected(true);
      setSocketId(wsService.getSocketId());
      setError(null);
    };

    const handleDisconnect = () => {
      logger.info('WebSocket disconnected in test component');
      setConnected(false);
      setSocketId(null);
    };

    const handleError = (err: Error) => {
      logger.error('WebSocket error in test component:', err);
      setError(err.message);
    };

    const handleMessage = (data: any) => {
      logger.info('Received message in test component:', data);
      setLastMessage(JSON.stringify(data));
    };

    // Register event listeners
    wsService.on('connect', handleConnect);
    wsService.on('disconnect', handleDisconnect);
    wsService.on('error', handleError);
    wsService.on('ai:message', handleMessage);
    wsService.on('test:response', handleMessage);

    // Cleanup
    return () => {
      wsService.off('connect', handleConnect);
      wsService.off('disconnect', handleDisconnect);
      wsService.off('error', handleError);
      wsService.off('ai:message', handleMessage);
      wsService.off('test:response', handleMessage);
    };
  }, []);

  const handleConnect = () => {
    if (user) {
      wsService.connect(user.id);
    } else {
      setError('User not authenticated');
    }
  };

  const handleDisconnect = () => {
    wsService.disconnect();
  };

  const handleSendMessage = () => {
    if (connected) {
      wsService.send('test', { message: testMessage });
      logger.info('Sent test message:', testMessage);
    } else {
      setError('Not connected to WebSocket server');
    }
  };

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          WebSocket Test
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="body1">Status:</Typography>
            <Chip 
              label={connected ? 'Connected' : 'Disconnected'} 
              color={connected ? 'success' : 'error'} 
              size="small" 
            />
          </Stack>

          {socketId && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              Socket ID: {socketId}
            </Typography>
          )}

          {user && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              User ID: {user.id}
            </Typography>
          )}

          <Typography variant="body2" sx={{ mb: 1 }}>
            WebSocket URL: {import.meta.env.VITE_WS_URL || 'http://localhost:3000'}
          </Typography>

          <Typography variant="body2" sx={{ mb: 1 }}>
            WebSocket Path: {import.meta.env.VITE_WS_PATH || '/ws'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {lastMessage && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">Last Message:</Typography>
            <Alert severity="info" sx={{ wordBreak: 'break-all' }}>
              {lastMessage}
            </Alert>
          </Box>
        )}

        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Test Message"
            variant="outlined"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            sx={{ mb: 2 }}
          />
        </Box>

        <Stack direction="row" spacing={2}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleConnect}
            disabled={connected}
          >
            Connect
          </Button>
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={handleDisconnect}
            disabled={!connected}
          >
            Disconnect
          </Button>
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleSendMessage}
            disabled={!connected}
          >
            Send Test Message
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default WebSocketTest; 