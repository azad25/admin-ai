import { io } from 'socket.io-client';
import { logger } from './logger';

/**
 * Test WebSocket connection directly from the browser console
 * Usage: 
 * 1. Import in your app: import './utils/websocket-console-test';
 * 2. Call from console: window.testWebSocketConnection()
 */
export const testWebSocketConnectionDirect = (userId = 'test-user-' + Math.floor(Math.random() * 10000)) => {
  const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
  const wsPath = import.meta.env.VITE_WS_PATH || '/ws';
  
  console.log('WebSocket Test Client');
  console.log('--------------------');
  console.log(`URL: ${wsUrl}`);
  console.log(`Path: ${wsPath}`);
  console.log(`User ID: ${userId}`);
  console.log('--------------------');
  
  // Create socket connection
  console.log('Connecting to WebSocket server...');
  const socket = io(wsUrl, {
    path: wsPath,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
    autoConnect: true,
    forceNew: true,
    transports: ['websocket', 'polling'],
  });
  
  // Connection events
  socket.on('connect', () => {
    console.log('✅ Connected to WebSocket server');
    console.log(`Socket ID: ${socket.id}`);
    console.log(`Transport: ${socket.io.engine.transport.name}`);
    
    // Register with the server
    console.log(`Registering user ${userId}...`);
    socket.emit('register', userId);
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
    console.log('Connection details:', { 
      url: wsUrl, 
      path: wsPath,
      transport: socket.io?.engine?.transport?.name || 'unknown',
    });
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`Disconnected: ${reason}`);
  });
  
  socket.on('register:confirmed', (data) => {
    console.log('✅ Registration confirmed:', data);
  });
  
  // Handle any other events
  socket.onAny((event, ...args) => {
    if (event !== 'connect_error') { // We already log this one
      console.log(`Event received: ${event}`, args);
    }
  });
  
  // Return the socket for further testing
  return socket;
};

// Add to window object for console access
if (typeof window !== 'undefined') {
  (window as any).testWebSocketConnection = testWebSocketConnectionDirect;
}

export default testWebSocketConnectionDirect; 