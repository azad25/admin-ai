import React, { useEffect, useState } from 'react';
import {
  Alert,
  CircularProgress,
  Stack,
  Typography,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { wsService } from '../services/websocket.service';
import { useSocket } from '../contexts/SocketContext';

export interface AISystemStatus {
  ready: boolean;
  connected: boolean;
  initialized: boolean;
  hasProviders: boolean;
  activeProviders: Array<{
    provider: string;
    model: string;
  }>;
}

export const AIStatusAlert: React.FC = () => {
  const [status, setStatus] = useState<AISystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected } = useSocket();

  useEffect(() => {
    const handleStatus = (systemStatus: AISystemStatus) => {
      console.log('Received AI system status:', systemStatus);
      setStatus(systemStatus);
      setIsLoading(false);
    };

    const handleReady = (data: { ready: boolean }) => {
      console.log('Received AI ready status:', data);
      if (data.ready && status) {
        setStatus(prev => prev ? { ...prev, ready: true } : null);
      }
    };

    // Subscribe to system status updates
    wsService.on('ai:status', handleStatus);
    wsService.on('ai:ready', handleReady);

    // Set initial connection status
    setStatus(prev => prev ? {
      ...prev,
      connected: isConnected
    } : {
      ready: false,
      connected: isConnected,
      initialized: false,
      hasProviders: false,
      activeProviders: []
    });

    return () => {
      wsService.off('ai:status', handleStatus);
      wsService.off('ai:ready', handleReady);
    };
  }, [isConnected]);

  if (isLoading) {
    return (
      <Alert severity="info">
        <Stack direction="row" alignItems="center" spacing={1}>
          <CircularProgress size={20} />
          <Typography>Checking AI system status...</Typography>
        </Stack>
      </Alert>
    );
  }

  if (!status) {
    return (
      <Alert severity="warning">
        <Stack direction="row" alignItems="center" spacing={1}>
          <WarningIcon />
          <Typography>Unable to determine AI system status</Typography>
        </Stack>
      </Alert>
    );
  }

  const getStatusDetails = () => {
    if (!status.connected) {
      return {
        severity: 'error',
        message: 'System disconnected',
        icon: ErrorIcon,
        tooltip: 'WebSocket connection is not established'
      };
    }

    if (!status.hasProviders) {
      return {
        severity: 'warning',
        message: 'No active AI providers',
        icon: WarningIcon,
        tooltip: 'Please configure and verify an AI provider in settings'
      };
    }

    if (!status.ready) {
      return {
        severity: 'info',
        message: 'AI system initializing',
        icon: InfoIcon,
        tooltip: 'AI system is starting up'
      };
    }

    const activeProvidersList = status.activeProviders
      .map(p => `${p.provider} (${p.model})`)
      .join(', ');

    return {
      severity: 'success',
      message: 'AI system online',
      icon: CheckCircleIcon,
      tooltip: `Connected providers: ${activeProvidersList}`
    };
  };

  const statusDetails = getStatusDetails();

  return (
    <Alert severity={statusDetails.severity as 'error' | 'warning' | 'info' | 'success'}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Tooltip title={statusDetails.tooltip}>
          <IconButton size="small" color="inherit">
            <statusDetails.icon />
          </IconButton>
        </Tooltip>
        <Typography>{statusDetails.message}</Typography>
      </Stack>
    </Alert>
  );
}; 