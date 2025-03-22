import React from 'react';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface DashboardHeaderProps {
  title: string;
  isConnected: boolean;
  loading: boolean;
  lastUpdate: Date;
  onRefresh: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  isConnected,
  loading,
  lastUpdate,
  onRefresh,
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant="h5" component="h1">
          {title}
        </Typography>
        <Chip
          label={isConnected ? 'Connected' : 'Offline'}
          color={isConnected ? 'success' : 'error'}
          size="small"
          sx={{ ml: 2 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
          Last updated: {lastUpdate.toLocaleTimeString()}
        </Typography>
      </Box>
      <IconButton onClick={onRefresh} disabled={loading}>
        <RefreshIcon />
      </IconButton>
    </Box>
  );
}; 