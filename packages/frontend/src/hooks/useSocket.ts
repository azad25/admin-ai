import { useState, useEffect } from 'react';
import { wsService } from '../services/websocket.service';
import { useAuth } from './useAuth';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(wsService.isConnected());
  const { user } = useAuth();

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    // Set up event listeners
    wsService.on('connect', handleConnect);
    wsService.on('disconnect', handleDisconnect);

    // Connect if we have a user ID
    if (user?.id && !wsService.isConnected()) {
      wsService.connect(user.id).catch(error => {
        console.error('Failed to connect to WebSocket:', error);
      });
    }

    // Check initial connection state
    setIsConnected(wsService.isConnected());

    return () => {
      wsService.off('connect', handleConnect);
      wsService.off('disconnect', handleDisconnect);
    };
  }, [user?.id]);

  return { isConnected };
}; 