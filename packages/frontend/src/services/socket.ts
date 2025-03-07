import { io } from 'socket.io-client';

// Create a socket instance
export const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});

// Socket event listeners
socket.on('connect', () => {
  console.log('Socket connected');
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

// Helper functions
export const emitEvent = (event: string, data: any) => {
  socket.emit(event, data);
};

export const subscribeToEvent = (event: string, callback: (data: any) => void) => {
  socket.on(event, callback);
  return () => {
    socket.off(event, callback);
  };
};

export const unsubscribeFromEvent = (event: string, callback: (data: any) => void) => {
  socket.off(event, callback);
};

export default {
  socket,
  emitEvent,
  subscribeToEvent,
  unsubscribeFromEvent,
}; 