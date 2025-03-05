import React from 'react';
import { Alert, AlertTitle, CircularProgress, Box } from '@mui/material';
import { useAppSelector } from '../hooks/redux';

export const AIStatusAlert: React.FC = () => {
  const { isLoading, isConnected, error, providers } = useAppSelector(state => state.ai);

  if (isLoading) {
    return (
      <Alert severity="info" sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CircularProgress size={20} sx={{ mr: 2 }} />
          Loading AI settings...
        </Box>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 4 }}>
        <AlertTitle>Error</AlertTitle>
        {error}
      </Alert>
    );
  }

  if (!isConnected) {
    return (
      <Alert severity="warning" sx={{ mb: 4 }}>
        <AlertTitle>Connection Issue</AlertTitle>
        Not connected to AI service. Some features may be unavailable.
      </Alert>
    );
  }

  if (!providers.length) {
    return (
      <Alert severity="info" sx={{ mb: 4 }}>
        <AlertTitle>No AI Providers</AlertTitle>
        Configure at least one AI provider to get started.
      </Alert>
    );
  }

  const activeProviders = providers.filter(p => p.isActive);
  if (!activeProviders.length) {
    return (
      <Alert severity="warning" sx={{ mb: 4 }}>
        <AlertTitle>No Active Providers</AlertTitle>
        Activate at least one AI provider to use AI features.
      </Alert>
    );
  }

  return (
    <Alert severity="success" sx={{ mb: 4 }}>
      <AlertTitle>AI Service Ready</AlertTitle>
      Connected with {activeProviders.length} active provider{activeProviders.length > 1 ? 's' : ''}.
    </Alert>
  );
}; 