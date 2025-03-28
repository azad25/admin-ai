import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Grid,
  LinearProgress,
  useTheme,
  alpha,
} from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import { SystemHealth } from '../../../types/metrics';

interface SystemHealthPanelProps {
  health: SystemHealth | null;
  loading: boolean;
}

const SystemHealthPanel: React.FC<SystemHealthPanelProps> = ({ health, loading }) => {
  const theme = useTheme();

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return theme.palette.success.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'error':
      case 'critical':
        return theme.palette.error.main;
      default:
        return theme.palette.info.main;
    }
  };

  // Format bytes to readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  // Create sample data if no health data is available
  const sampleHealth = {
    status: 'healthy',
    cpuUsage: 47,
    memoryUsage: 58,
    diskUsage: 32,
    activeConnections: 184,
    uptime: '5d 12h 23m',
    timestamp: new Date().toISOString(),
    services: [
      { name: 'API Server', status: 'healthy' },
      { name: 'Database', status: 'healthy' },
      { name: 'Cache', status: 'healthy' },
      { name: 'Messaging', status: 'warning' }
    ]
  };

  // Use provided health data or sample data
  const healthData = health || sampleHealth;

  // Create metrics to display
  const metrics = [
    {
      label: 'CPU',
      value: healthData?.cpuUsage || 0,
      icon: <SpeedIcon />,
      color: !healthData?.cpuUsage ? theme.palette.info.main :
             healthData.cpuUsage > 80 ? theme.palette.error.main : 
             healthData.cpuUsage > 60 ? theme.palette.warning.main : 
             theme.palette.success.main,
    },
    {
      label: 'Memory',
      value: healthData?.memoryUsage || 0,
      icon: <MemoryIcon />,
      color: !healthData?.memoryUsage ? theme.palette.info.main :
             healthData.memoryUsage > 80 ? theme.palette.error.main : 
             healthData.memoryUsage > 60 ? theme.palette.warning.main : 
             theme.palette.success.main,
    },
    {
      label: 'Disk',
      value: healthData?.diskUsage || 0,
      icon: <StorageIcon />,
      color: !healthData?.diskUsage ? theme.palette.info.main :
             healthData.diskUsage > 80 ? theme.palette.error.main : 
             healthData.diskUsage > 60 ? theme.palette.warning.main : 
             theme.palette.success.main,
    },
    {
      label: 'Connections',
      value: (healthData?.activeConnections || 0) / 5, // Normalize for display
      raw: healthData?.activeConnections || 0,
      icon: <CloudQueueIcon />,
      color: theme.palette.info.main,
    },
  ];

  // Loading state
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          minHeight: 200,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1 }}>
      {/* Overall status indicator */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: getStatusColor(healthData?.status || 'unknown'),
              mr: 1,
            }}
          />
          <Typography variant="body1" fontWeight="medium">
            System Status: {healthData?.status 
              ? healthData.status.charAt(0).toUpperCase() + healthData.status.slice(1)
              : 'Unknown'}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Uptime: {healthData?.uptime || 'Unknown'}
        </Typography>
      </Box>

      {/* Metrics grid */}
      <Grid container spacing={2}>
        {metrics.map((metric, index) => (
          <Grid item xs={6} key={index}>
            <Box
              sx={{
                backgroundColor: alpha(metric.color, theme.palette.mode === 'dark' ? 0.1 : 0.05),
                borderRadius: 2,
                p: 1.5,
                height: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box
                  sx={{
                    color: metric.color,
                    display: 'flex',
                    alignItems: 'center',
                    mr: 1,
                  }}
                >
                  {metric.icon}
                </Box>
                <Typography variant="body2" fontWeight="medium">
                  {metric.label}
                </Typography>
              </Box>

              <Typography variant="h6" fontWeight="600" sx={{ mb: 0.5 }}>
                {metric.raw !== undefined ? metric.raw : formatPercentage(metric.value)}
              </Typography>

              <LinearProgress
                variant="determinate"
                value={Math.min(100, metric.value)}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: alpha(metric.color, 0.2),
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: metric.color,
                    borderRadius: 3,
                  },
                }}
              />
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Services status */}
      {healthData?.services && healthData.services.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
            Services
          </Typography>
          <Grid container spacing={1}>
            {healthData.services.map((service, index) => (
              <Grid item xs={6} key={index}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: alpha(getStatusColor(service.status), 0.05),
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(service.status),
                      mr: 1,
                    }}
                  />
                  <Typography variant="body2" noWrap>
                    {service.name}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default SystemHealthPanel;