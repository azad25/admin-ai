import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  BugReport as BugIcon,
  CloudQueue as CloudIcon,
} from '@mui/icons-material';

const metrics = [
  {
    name: 'CPU Usage',
    value: '45%',
    icon: MemoryIcon,
  },
  {
    name: 'Response Time',
    value: '120ms',
    icon: SpeedIcon,
  },
  {
    name: 'Error Rate',
    value: '0.5%',
    icon: BugIcon,
  },
  {
    name: 'API Calls',
    value: '1.2K/min',
    icon: CloudIcon,
  },
];

export const AIMetricsPanel: React.FC = () => {
  const theme = useTheme();

  return (
    <Box>
      <List>
        {metrics.map((metric, index) => (
          <React.Fragment key={metric.name}>
            <ListItem>
              <ListItemIcon>
                <metric.icon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={metric.name}
                secondary={
                  <Typography
                    component="span"
                    variant="h6"
                    color="text.primary"
                  >
                    {metric.value}
                  </Typography>
                }
              />
            </ListItem>
            {index < metrics.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
}; 