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
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { RequestMetric } from '../types/metrics';
import { formatDistanceToNow } from 'date-fns';

interface AIActivityTimelineProps {
  data: RequestMetric[];
}

export const AIActivityTimeline: React.FC<AIActivityTimelineProps> = ({ data }) => {
  const theme = useTheme();

  // Check if data is an array and has items
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 2 }}>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 1 }}>
          <Typography color="text.secondary">No activity data available</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 2 }}>
      <List>
        {data.map((metric, index) => (
          <React.Fragment key={index}>
            <ListItem
              sx={{
                borderLeft: `4px solid ${metric.statusCode < 400 ? theme.palette.success.main : theme.palette.error.main}`,
                mb: 1,
                backgroundColor: theme.palette.background.paper,
                borderRadius: 1,
              }}
            >
              <ListItemIcon>
                {metric.statusCode < 400 ? (
                  <SuccessIcon color="success" />
                ) : (
                  <ErrorIcon color="error" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="subtitle2">
                    {metric.method} {metric.path}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography variant="caption" color="textSecondary" display="block">
                      {formatDistanceToNow(new Date(metric.timestamp))} ago
                      {' • '}
                      {metric.duration}ms
                      {' • '}
                      Status: {metric.statusCode}
                    </Typography>
                    {metric.location && (
                      <Typography variant="caption" color="textSecondary" display="block">
                        From: {metric.location.city}, {metric.location.country}
                      </Typography>
                    )}
                  </>
                }
              />
            </ListItem>
            {index < data.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
}; 