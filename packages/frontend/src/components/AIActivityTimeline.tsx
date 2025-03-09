import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  useTheme,
  Divider,
  Paper,
  Chip,
  Avatar,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Memory as MemoryIcon,
  Psychology as PsychologyIcon,
  Analytics as AnalyticsIcon,
  Insights as InsightsIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

// Custom activity data interface that works with our sample data
export interface ActivityData {
  timestamp: string;
  path: string;
  method: string;
  statusCode: number;
  duration: number;
  ip: string;
  location?: {
    city: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  userAgent?: string;
  referer?: string;
  query?: string;
}

interface AIActivityTimelineProps {
  data: ActivityData[];
}

// Define valid color types for MUI components
type SeverityColorType = 'error' | 'warning' | 'success' | 'info' | 'primary' | 'secondary' | 'default';

// Get icon based on activity type
const getActivityIcon = (path: string, statusCode: number) => {
  if (statusCode >= 400) {
    return <ErrorIcon color="error" />;
  }
  
  if (path.includes('/ai/')) {
    return <PsychologyIcon color="primary" />;
  }
  
  if (path.includes('/metrics/')) {
    return <AnalyticsIcon color="secondary" />;
  }
  
  if (path.includes('/security/')) {
    return <SecurityIcon color="warning" />;
  }
  
  if (path.includes('/insights/')) {
    return <InsightsIcon style={{ color: '#9c27b0' }} />;
  }
  
  return <SuccessIcon color="success" />;
};

// Get activity type label
const getActivityType = (path: string) => {
  if (path.includes('/ai/')) {
    return 'AI Processing';
  }
  
  if (path.includes('/metrics/')) {
    return 'Metrics Analysis';
  }
  
  if (path.includes('/security/')) {
    return 'Security Check';
  }
  
  if (path.includes('/insights/')) {
    return 'Insight Generation';
  }
  
  if (path.includes('/health/')) {
    return 'Health Check';
  }
  
  return 'API Request';
};

// Get severity color and its corresponding palette color
const getSeverityColor = (statusCode: number, duration: number): SeverityColorType => {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warning';
  if (duration > 1000) return 'warning';
  return 'success';
};

// Get the actual color value from the theme palette
const getSeverityColorValue = (theme: any, statusCode: number, duration: number): string => {
  const colorType = getSeverityColor(statusCode, duration);
  switch (colorType) {
    case 'error':
      return theme.palette.error.main;
    case 'warning':
      return theme.palette.warning.main;
    case 'success':
      return theme.palette.success.main;
    case 'info':
      return theme.palette.info.main;
    default:
      return theme.palette.primary.main;
  }
};

export const AIActivityTimeline: React.FC<AIActivityTimelineProps> = ({ data }) => {
  const theme = useTheme();

  // Check if data is an array and has items
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 2 }}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2, bgcolor: theme.palette.background.paper }}>
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={2}>
            <PsychologyIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No AI Activity Data Available
            </Typography>
            <Typography color="text.secondary" align="center">
              AI activity will appear here once the system processes requests.
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  // Generate sample data if needed (for development/demo purposes)
  const activityData = data.length > 0 ? data : [
    {
      timestamp: new Date().toISOString(),
      path: '/api/ai/analyze',
      method: 'POST',
      statusCode: 200,
      duration: 450,
      ip: '192.168.1.1',
      location: { city: 'San Francisco', country: 'USA' }
    },
    {
      timestamp: new Date(Date.now() - 120000).toISOString(),
      path: '/api/metrics/performance',
      method: 'GET',
      statusCode: 200,
      duration: 120,
      ip: '192.168.1.2',
      location: { city: 'London', country: 'UK' }
    },
    {
      timestamp: new Date(Date.now() - 300000).toISOString(),
      path: '/api/security/scan',
      method: 'POST',
      statusCode: 201,
      duration: 890,
      ip: '192.168.1.3',
      location: { city: 'Tokyo', country: 'Japan' }
    },
    {
      timestamp: new Date(Date.now() - 600000).toISOString(),
      path: '/api/insights/generate',
      method: 'POST',
      statusCode: 500,
      duration: 1200,
      ip: '192.168.1.4',
      location: { city: 'Singapore', country: 'Singapore' }
    }
  ];

  return (
    <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 2 }}>
      <Paper elevation={3} sx={{ p: 2, borderRadius: 2, bgcolor: theme.palette.background.paper }}>
        <Typography variant="h6" gutterBottom sx={{ px: 2, pt: 1, fontWeight: 'medium' }}>
          AI Activity
        </Typography>
        <List>
          {activityData.map((metric, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <ListItem
                sx={{
                  borderLeft: `4px solid ${getSeverityColorValue(theme, metric.statusCode, metric.duration)}`,
                  mb: 1,
                  backgroundColor: theme.palette.background.default,
                  borderRadius: '0 8px 8px 0',
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                    transform: 'translateX(4px)',
                  },
                }}
              >
                <ListItemIcon>
                  {getActivityIcon(metric.path, metric.statusCode)}
                </ListItemIcon>
                
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" fontWeight="medium">
                      {getActivityType(metric.path)}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${metric.statusCode}`}
                      color={getSeverityColor(metric.statusCode, metric.duration)}
                      variant="outlined"
                    />
                  </Box>
                  
                  <Typography variant="caption" color="textSecondary" display="block">
                    {metric.method} {metric.path}
                  </Typography>
                  
                  <Box display="flex" alignItems="center" mt={0.5}>
                    <Box sx={{ mr: 1 }}>
                      <Tooltip title="Response time" placement="top">
                        <Chip
                          size="small"
                          label={`${metric.duration}ms`}
                          variant="outlined"
                          sx={{ height: 20 }}
                        />
                      </Tooltip>
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      {formatDistanceToNow(new Date(metric.timestamp))} ago
                    </Typography>
                  </Box>
                  
                  {metric.location && (
                    <Box display="flex" alignItems="center" mt={0.5}>
                      <Avatar
                        sx={{ width: 16, height: 16, mr: 1, fontSize: '0.6rem' }}
                      >
                        {metric.location.country.substring(0, 2)}
                      </Avatar>
                      <Typography variant="caption" color="textSecondary">
                        {metric.location.city}, {metric.location.country}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box mt={1}>
                    <Tooltip title={`Response time: ${metric.duration}ms`}>
                      <div>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, (metric.duration / 1000) * 100)}
                          color={metric.duration > 1000 ? "warning" : "primary"}
                          sx={{ height: 3, borderRadius: 5 }}
                        />
                      </div>
                    </Tooltip>
                  </Box>
                </Box>
              </ListItem>
              {index < activityData.length - 1 && <Divider variant="inset" component="li" />}
            </motion.div>
          ))}
        </List>
      </Paper>
    </Box>
  );
}; 