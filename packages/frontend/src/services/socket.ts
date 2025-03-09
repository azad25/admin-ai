import { wsService } from './websocket.service';

// Re-export the websocket service as socket
export const socket = wsService;

// Helper functions
export const emitEvent = (event: string, data: any) => {
  wsService.send(event as any, data);
};

export const subscribeToEvent = (event: string, callback: (data: any) => void) => {
  wsService.on(event, callback);
  return () => {
    wsService.off(event, callback);
  };
};

export const unsubscribeFromEvent = (event: string, callback: (data: any) => void) => {
  wsService.off(event, callback);
};

export default {
  socket,
  emitEvent,
  subscribeToEvent,
  unsubscribeFromEvent,
}; 