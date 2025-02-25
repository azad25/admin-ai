import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Analytics as AnalysisIcon,
  Psychology as PredictionIcon,
  PlayArrow as ActionIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { AIActivity } from '../types/system';

interface AIActivityFeedProps {
  activities: AIActivity[];
  maxHeight?: number;
}

export const AIActivityFeed: React.FC<AIActivityFeedProps> = ({
  activities,
  maxHeight = 400,
}) => {
  const theme = useTheme();

  const getIcon = (type: AIActivity['type']) => {
    switch (type) {
      case 'analysis':
        return <AnalysisIcon />;
      case 'prediction':
        return <PredictionIcon />;
      case 'action':
        return <ActionIcon />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <AnalysisIcon />;
    }
  };

  const getStatusColor = (status: AIActivity['status']) => {
    switch (status) {
      case 'success':
        return theme.palette.success;
      case 'error':
        return theme.palette.error;
      case 'warning':
        return theme.palette.warning;
      case 'info':
        return theme.palette.info;
      default:
        return theme.palette.info;
    }
  };

  return (
    <List
      sx={{
        width: '100%',
        maxHeight,
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: 8,
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: theme.palette.background.default,
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: theme.palette.grey[500],
          borderRadius: 4,
        },
      }}
    >
      {activities.map((activity) => {
        const statusColor = getStatusColor(activity.status);
        return (
          <ListItem
            key={activity.id}
            sx={{
              mb: 1,
              borderRadius: 1,
              backgroundColor: alpha(statusColor.main, 0.1),
              '&:hover': {
                backgroundColor: alpha(statusColor.main, 0.15),
              },
            }}
          >
            <ListItemIcon sx={{ color: statusColor.main }}>
              {getIcon(activity.type)}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body1" color="textPrimary">
                    {activity.description}
                  </Typography>
                  <Chip
                    label={activity.type}
                    size="small"
                    sx={{
                      backgroundColor: alpha(statusColor.main, 0.2),
                      color: statusColor.main,
                    }}
                  />
                </Box>
              }
              secondary={
                <Typography variant="caption" color="textSecondary">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </Typography>
              }
            />
          </ListItem>
        );
      })}
      {activities.length === 0 && (
        <ListItem>
          <ListItemText
            primary={
              <Typography variant="body2" color="textSecondary" align="center">
                No activities to display
              </Typography>
            }
          />
        </ListItem>
      )}
    </List>
  );
}; 