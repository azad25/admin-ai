// Test WebSocket Connection Script
const { io } = require('socket.io-client');

// Configuration
const WS_URL = process.env.VITE_WS_URL || 'http://localhost:3000';
const WS_PATH = process.env.VITE_WS_PATH || '/ws';

console.log('WebSocket Test Script');
console.log(`Connecting to: ${WS_URL} with path: ${WS_PATH}`);

// Create socket connection
const socket = io(WS_URL, {
  path: WS_PATH,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
  autoConnect: true,
  forceNew: true,
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to WebSocket server!');
  console.log(`Socket ID: ${socket.id}`);
  
  // Send a test message
  socket.emit('test', { message: 'Hello from test script!' });
  
  // Wait a bit and then disconnect
  setTimeout(() => {
    console.log('Test complete, disconnecting...');
    socket.disconnect();
    process.exit(0);
  }, 5000);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  console.log('Connection details:', {
    url: WS_URL,
    path: WS_PATH,
    transport: socket.io.engine?.transport?.name,
    protocol: socket.io.engine?.transport?.protocol,
    readyState: socket.io.engine?.readyState
  });
});

socket.on('disconnect', (reason) => {
  console.log(`Disconnected: ${reason}`);
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('Closing connection and exiting...');
  socket.disconnect();
  process.exit(0);
});

// Set a timeout for the entire test
setTimeout(() => {
  console.log('Test timeout reached, exiting...');
  socket.disconnect();
  process.exit(1);
}, 15000); 