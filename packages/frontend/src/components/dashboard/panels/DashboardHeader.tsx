import React from 'react';
import {
  Typography,
  Grid,
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface DashboardHeaderProps {
  title: string;
  isConnected: boolean;
  loading: boolean;
  lastUpdate: Date | null;
  onRefresh: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  isConnected,
  loading,
  lastUpdate,
  onRefresh,
}) => {
  return (
    <Box sx={{ mb: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs>
          <Typography variant="h4" component="h1">
            {title}
          </Typography>
        </Grid>
        <Grid item>
          <Tooltip title={isConnected ? "Connected" : "Disconnected"}>
            <Box component="span" sx={{ mr: 2, display: 'inline-flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: isConnected ? 'success.main' : 'error.main',
                  mr: 1
                }}
              />
              <Typography variant="body2" color={isConnected ? 'success.main' : 'error.main'}>
                {isConnected ? 'Live' : 'Offline'}
              </Typography>
            </Box>
          </Tooltip>
          <Tooltip title="Refresh Data">
            <span>
              <IconButton onClick={onRefresh} disabled={loading}>
                {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
          {lastUpdate && (
            <Typography variant="caption" color="textSecondary" sx={{ ml: 2 }}>
              Last updated: {lastUpdate.toLocaleTimeString()}
              {!isConnected && ' (Offline)'}
            </Typography>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardHeader;