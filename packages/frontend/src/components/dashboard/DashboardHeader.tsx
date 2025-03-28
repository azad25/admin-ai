import React from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CloudOff as CloudOffIcon,
  SignalWifi4Bar as SignalIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  isConnected: boolean;
  loading: boolean;
  lastUpdate: Date;
  onRefresh: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  isConnected,
  loading,
  lastUpdate,
  onRefresh,
}) => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 3,
      }}
    >
      <Box>
        <Typography 
          variant="h4" 
          component="h1" 
          fontWeight="500"
          sx={{ mb: 0.5 }}
        >
          {title}
        </Typography>
        
        {subtitle && (
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ mb: 1 }}
          >
            {subtitle}
          </Typography>
        )}
        
        <Box 
          sx={{
            display: 'flex', 
            alignItems: 'center', 
            mt: 0.5
          }}
        >
          <Chip
            size="small"
            icon={isConnected ? <SignalIcon fontSize="small" /> : <CloudOffIcon fontSize="small" />}
            label={isConnected ? "Connected" : "Offline"}
            color={isConnected ? "success" : "error"}
            variant="outlined"
            sx={{ mr: 1.5, height: 24 }}
          />
          
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ 
              display: 'flex',
              alignItems: 'center',
            }}
          >
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Typography>
        </Box>
      </Box>
      
      <Box
        sx={{
          display: 'flex',
          mt: { xs: 2, sm: 0 },
          gap: 1,
        }}
      >
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon />}
          sx={{
            borderRadius: 1,
            textTransform: 'none',
            px: 2,
          }}
        >
          Export
        </Button>
        
        <Button
          variant="contained"
          size="small"
          startIcon={loading ? <CircularProgress size={16} thickness={4} color="inherit" /> : <RefreshIcon />}
          onClick={onRefresh}
          disabled={loading}
          sx={{
            borderRadius: 1,
            textTransform: 'none',
            px: 2,
            backgroundColor: theme.palette.primary.main,
          }}
        >
          {loading ? 'Updating...' : 'Update now'}
        </Button>
      </Box>
    </Box>
  );
}; 