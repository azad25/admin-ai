import { io, Socket } from 'socket.io-client';
import { logger } from '../utils/logger';

// Configuration
const WS_URL = process.env.WS_URL || 'http://localhost:3000';
const WS_PATH = process.env.WS_PATH || '/ws/';
const USER_ID = 'test-user-' + Date.now();

logger.info('WebSocket Test Script');
logger.info('---------------------');
logger.info(`Connecting to: ${WS_URL}`);
logger.info(`Path: ${WS_PATH}`);
logger.info(`User ID: ${USER_ID}`);

// Create socket connection
const socket = io(WS_URL, {
  path: WS_PATH,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 5000,
  autoConnect: true,
  forceNew: true,
});

// Set up event handlers
socket.on('connect', () => {
  logger.info('✅ Connected to WebSocket server');
  logger.info(`Socket ID: ${socket.id}`);
  
  // Register with the server
  socket.emit('register', USER_ID);
  logger.info(`Sent registration for user ${USER_ID}`);
  
  // Send a test message
  setTimeout(() => {
    logger.info('Sending test message...');
    socket.emit('ai:chat', { message: 'Hello from test script!' });
  }, 1000);
  
  // Disconnect after some time
  setTimeout(() => {
    logger.info('Test complete, disconnecting...');
    socket.disconnect();
    process.exit(0);
  }, 5000);
});

socket.on('connect_error', (error) => {
  logger.error('❌ Connection error:', error);
  logger.error('Connection details:', {
    url: WS_URL,
    path: WS_PATH,
    transport: socket.io?.engine?.transport?.name || 'unknown',
  });
});

socket.on('disconnect', (reason) => {
  logger.warn(`Disconnected: ${reason}`);
});

socket.on('register:confirmed', (data) => {
  logger.info('Registration confirmed:', data);
});

socket.on('ai:message', (data) => {
  logger.info('Received AI message:', data);
});

socket.on('ai:error', (data) => {
  logger.error('Received AI error:', data);
});

// Handle process termination
process.on('SIGINT', () => {
  logger.info('Received SIGINT, disconnecting...');
  socket.disconnect();
  process.exit(0);
});

// Set a timeout for the entire test
setTimeout(() => {
  logger.error('Test timed out after 10 seconds');
  socket.disconnect();
  process.exit(1);
}, 10000); 