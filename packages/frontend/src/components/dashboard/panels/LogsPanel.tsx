import React from 'react';
import { Paper, Typography, Box, List, ListItem, ListItemText, Chip } from '@mui/material';
import { Replay } from '@mui/icons-material';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
}

export interface LogsPanelProps {
  logs: LogEntry[];
  maxEntries?: number;
}

const LogsPanel: React.FC<LogsPanelProps> = ({ logs, maxEntries = 5 }) => {
  const displayLogs = logs.slice(0, maxEntries);
  
  // Function to render the chip with the correct color
  const renderLevelChip = (level: string) => {
    switch (level) {
      case 'error':
        return <Chip label={level.toUpperCase()} size="small" color="error" sx={{ minWidth: 60 }} />;
      case 'warn':
        return <Chip label={level.toUpperCase()} size="small" color="warning" sx={{ minWidth: 60 }} />;
      case 'info':
        return <Chip label={level.toUpperCase()} size="small" color="info" sx={{ minWidth: 60 }} />;
      case 'debug':
      default:
        return <Chip label={level.toUpperCase()} size="small" color="default" sx={{ minWidth: 60 }} />;
    }
  };

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Recent Logs</Typography>
        <Replay fontSize="small" sx={{ cursor: 'pointer' }} />
      </Box>
      
      {displayLogs.length > 0 ? (
        <List dense sx={{ overflow: 'auto', flex: 1 }}>
          {displayLogs.map((log) => (
            <ListItem key={log.id} divider>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {renderLevelChip(log.level)}
                    <Typography variant="body2" component="span">
                      {log.message}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="caption" component="span" color="text.secondary">
                      {log.source}
                    </Typography>
                    <Typography variant="caption" component="span" color="text.secondary">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Typography color="text.secondary">No logs available</Typography>
        </Box>
      )}
    </Paper>
  );
};

export default LogsPanel;