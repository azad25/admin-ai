import React from 'react';
import {
  Typography,
  Grid,
  Paper,
  Box,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { SystemHealth, ServiceHealth } from '../../../types/metrics';

interface SystemHealthPanelProps {
  health: SystemHealth | null;
  loading: boolean;
}

const SystemHealthPanel: React.FC<SystemHealthPanelProps> = ({ health, loading }) => {
  // Helper functions
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'up':
      case 'normal':
      case 'healthy':
        return 'success';
      case 'degraded':
      case 'warning':
        return 'warning';
      default:
        return 'error';
    }
  };

  return (
    <Grid container spacing={3}>
      {/* System Health */}
      <Grid item xs={12} sm={6}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            System Health
          </Typography>
          {health ? (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body1" sx={{ mr: 1 }}>
                  Status:
                </Typography>
                <Chip
                  label={health.score > 80 ? 'healthy' : health.score > 60 ? 'warning' : 'error'}
                  color={getStatusColor(
                    health.score > 80 ? 'healthy' : health.score > 60 ? 'warning' : 'error'
                  )}
                  size="small"
                />
              </Box>
              {health.uptime !== undefined && (
                <Typography variant="body2">
                  Uptime: {Math.floor(health.uptime / 3600)} hours{' '}
                  {Math.floor((health.uptime % 3600) / 60)} minutes
                </Typography>
              )}
              {health.timestamp && (
                <Typography variant="body2">
                  Last Updated: {formatDate(health.timestamp)}
                </Typography>
              )}
            </Box>
          ) : (
            <CircularProgress size={24} />
          )}
        </Paper>
      </Grid>

      {/* CPU Usage */}
      <Grid item xs={12} sm={6}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            CPU
          </Typography>
          {health?.resources?.cpu ? (
            <Box>
              <Typography variant="h4" color="primary">
                {health.resources.cpu.usage.toFixed(1)}%
              </Typography>
              <Chip
                label={health.resources.cpu.status}
                color={getStatusColor(health.resources.cpu.status)}
                size="small"
              />
            </Box>
          ) : (
            <CircularProgress size={24} />
          )}
        </Paper>
      </Grid>

      {/* Memory Usage */}
      <Grid item xs={12} sm={6}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Memory
          </Typography>
          {health?.resources?.memory ? (
            <Box>
              <Typography variant="h4" color="primary">
                {health.resources.memory.usage.toFixed(1)}%
              </Typography>
              <Chip
                label={health.resources.memory.status}
                color={getStatusColor(health.resources.memory.status)}
                size="small"
              />
            </Box>
          ) : (
            <CircularProgress size={24} />
          )}
        </Paper>
      </Grid>

      {/* Disk Usage */}
      <Grid item xs={12} sm={6}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Disk
          </Typography>
          {health?.resources?.disk ? (
            <Box>
              <Typography variant="h4" color="primary">
                {health.resources.disk.usage.toFixed(1)}%
              </Typography>
              <Chip
                label={health.resources.disk.status}
                color={getStatusColor(health.resources.disk.status)}
                size="small"
              />
            </Box>
          ) : (
            <CircularProgress size={24} />
          )}
        </Paper>
      </Grid>

      {/* Services Status */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Services Status
          </Typography>
          {health?.services ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Service</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Check</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Database</TableCell>
                    <TableCell>
                      <Chip
                        label={health.services.database.status}
                        color={getStatusColor(health.services.database.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(health.services.database.lastCheck), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Cache</TableCell>
                    <TableCell>
                      <Chip
                        label={health.services.cache.status}
                        color={getStatusColor(health.services.cache.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(health.services.cache.lastCheck), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Queue</TableCell>
                    <TableCell>
                      <Chip
                        label={health.services.queue.status}
                        color={getStatusColor(health.services.queue.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(health.services.queue.lastCheck), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <CircularProgress size={24} />
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};

export default SystemHealthPanel;