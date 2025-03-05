import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import WebSocketTestComponent from '../components/WebSocketTest';

const WebSocketTestPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          WebSocket Connection Test
        </Typography>
        <Typography variant="body1" paragraph>
          This page allows you to test the WebSocket connection between the frontend and backend.
          You can connect, disconnect, and send test messages to verify that the WebSocket is working properly.
        </Typography>
        
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Troubleshooting Tips
          </Typography>
          <Typography variant="body2" component="ul">
            <li>Make sure the backend server is running</li>
            <li>Check that the WebSocket path in frontend matches the backend ('/ws')</li>
            <li>Verify that the WebSocket URL is correct (http://localhost:3000)</li>
            <li>Check browser console for any WebSocket-related errors</li>
            <li>If you see "xhr poll error", it typically means the WebSocket server is not reachable</li>
          </Typography>
        </Paper>
        
        <WebSocketTestComponent />
      </Box>
    </Container>
  );
};

export default WebSocketTestPage; 