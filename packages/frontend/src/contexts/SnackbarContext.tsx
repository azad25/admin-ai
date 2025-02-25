import React, { createContext, useContext } from 'react';
import { useSocket } from './SocketContext';
import { alpha } from '@mui/material/styles';

interface NotificationOptions {
  category?: string;
  source?: {
    page?: string;
    controller?: string;
    action?: string;
    details?: Record<string, any>;
  };
  priority?: 'high' | 'medium' | 'low';
  actions?: Array<{
    label: string;
    action: string;
    data?: any;
  }>;
}

interface SnackbarContextType {
  showSuccess: (message: string, options?: NotificationOptions) => void;
  showError: (message: string, options?: NotificationOptions) => void;
  showInfo: (message: string, options?: NotificationOptions) => void;
  showWarning: (message: string, options?: NotificationOptions) => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const SnackbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sendNotification } = useSocket();

  const getNotificationStyle = (status: 'success' | 'error' | 'info' | 'warning') => {
    const styles = {
      success: {
        icon: '✓',
        color: '#4caf50',
        background: alpha('#4caf50', 0.1),
      },
      error: {
        icon: '✕',
        color: '#f44336',
        background: alpha('#f44336', 0.1),
      },
      info: {
        icon: 'ℹ',
        color: '#2196f3',
        background: alpha('#2196f3', 0.1),
      },
      warning: {
        icon: '⚠',
        color: '#ff9800',
        background: alpha('#ff9800', 0.1),
      },
    };
    return styles[status];
  };

  const createNotification = (
    message: string, 
    status: 'success' | 'error' | 'info' | 'warning',
    options?: NotificationOptions
  ) => {
    const style = getNotificationStyle(status);
    const sourceInfo = options?.source 
      ? `[${options.source.page || ''}${options.source.controller ? ' > ' + options.source.controller : ''}${options.source.action ? ' > ' + options.source.action : ''}]`
      : '';
    
    const formattedMessage = sourceInfo ? `${sourceInfo} ${message}` : message;

    sendNotification({
      id: crypto.randomUUID(),
      content: formattedMessage,
      role: 'system',
      metadata: {
        type: 'notification',
        status,
        category: options?.category || 'system',
        source: options?.source,
        priority: options?.priority || 'medium',
        timestamp: Date.now(),
        read: false,
        style: {
          icon: style.icon,
          color: style.color,
          background: style.background,
          animation: {
            enter: 'slideIn',
            exit: 'slideOut',
            duration: 0.5,
          },
        },
        actions: options?.actions || [
          {
            label: 'Dismiss',
            action: 'dismiss',
          },
        ],
      },
    });
  };

  const value = {
    showSuccess: (message: string, options?: NotificationOptions) => 
      createNotification(message, 'success', options),
    showError: (message: string, options?: NotificationOptions) => 
      createNotification(message, 'error', options),
    showInfo: (message: string, options?: NotificationOptions) => 
      createNotification(message, 'info', options),
    showWarning: (message: string, options?: NotificationOptions) => 
      createNotification(message, 'warning', options),
  };

  return (
    <SnackbarContext.Provider value={value}>
      {children}
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
}; 