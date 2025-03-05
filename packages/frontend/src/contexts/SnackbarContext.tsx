import React, { createContext, useContext } from 'react';
import { useSocket } from './SocketContext';
import { alpha } from '@mui/material/styles';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

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
    
    logger.debug('Creating notification:', { message: formattedMessage, status, options });

    // Create notification object
    const notification = {
      id: uuidv4(),
      content: formattedMessage,
      role: 'system' as const,
      metadata: {
        type: 'notification' as const,
        status,
        category: options?.category || 'system',
        source: options?.source,
        priority: options?.priority || 'medium',
        timestamp: new Date(Date.now()).toISOString(),
        read: false,
        style: {
          icon: style.icon,
          color: style.color,
          background: style.background,
          animation: 'slideIn',
        },
        actions: options?.actions || [
          {
            label: 'Dismiss',
            action: 'dismiss',
          },
        ],
      },
      timestamp: new Date(Date.now()).toISOString(),
    };

    // Send notification to AI panel via socket
    try {
      sendNotification(notification);
      logger.debug('Notification sent to AI panel:', notification.id);
    } catch (error) {
      logger.error('Failed to send notification:', error);
    }
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