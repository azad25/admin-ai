import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { LiveRequestMap } from '../LiveRequestMap';
import { SystemHealth, LogEntry, ErrorLogEntry, AuthLogEntry, RequestMetric, RequestLocation } from '../../services/systemMetrics.service';
import { CrudItem, CrudField } from '../../types/crud';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { useSocket } from '../../hooks';
import { wsService } from '../../services/websocket.service';
import type { 
  SystemMetrics, 
  MetricsUpdate,
  ServiceHealth 
} from '../../types/metrics';

interface SystemDashboardProps {
  health: SystemHealth | null;
  recentLogs: LogEntry[];
  errorLogs: ErrorLogEntry[];
  authLogs: AuthLogEntry[];
  requestMetrics: RequestMetric[];
  locations: RequestLocation[];
  items: CrudItem[];
  fields: CrudField[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onAdd: () => void;
  onEdit: (item: CrudItem) => void;
  onDelete: (item: CrudItem) => void;
}

// Helper function to normalize health data
const normalizeHealth = (health: SystemHealth | null): SystemHealth | null => {
  if (!health || !health.services) return null;
  
  // Helper to normalize service status
  const normalizeStatus = (status: string): ServiceHealth['status'] => {
    switch (status) {
      case 'up':
      case 'down':
      case 'degraded':
        return status;
      default:
        return 'degraded';
    }
  };

  // Ensure services have valid status values
  const normalizedServices: SystemHealth['services'] = {
    database: {
      ...health.services.database,
      status: normalizeStatus(health.services.database.status)
    },
    cache: {
      ...health.services.cache,
      status: normalizeStatus(health.services.cache.status)
    },
    queue: {
      ...health.services.queue,
      status: normalizeStatus(health.services.queue.status)
    }
  };

  return {
    ...health,
    services: normalizedServices
  };
};

export const SystemDashboard: React.FC<SystemDashboardProps> = ({
  health: initialHealth,
  recentLogs: initialRecentLogs,
  errorLogs: initialErrorLogs,
  authLogs: initialAuthLogs,
  requestMetrics: initialRequestMetrics,
  locations: initialLocations,
  items,
  fields,
  loading,
  error,
  onRefresh,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const theme = useTheme();
  const [chartType, setChartType] = React.useState<'line' | 'bar' | 'area'>('line');
  const { isConnected } = useSocket();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Local state for real-time updates
  const [health, setHealth] = useState<SystemHealth | null>(() => normalizeHealth(initialHealth));
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>(initialRecentLogs);
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>(initialErrorLogs);
  const [authLogs, setAuthLogs] = useState<AuthLogEntry[]>(initialAuthLogs);
  const [requestMetrics, setRequestMetrics] = useState<RequestMetric[]>(initialRequestMetrics);
  const [locations, setLocations] = useState<RequestLocation[]>(initialLocations);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleMetricsUpdate = useCallback((data: MetricsUpdate) => {
    if (data.health) {
      setHealth(normalizeHealth(data.health));
    }
    if (data.metrics) {
      setMetrics(data.metrics);
    }
    setLastUpdate(new Date());
  }, []);

  const handleLogsUpdate = useCallback((data: LogEntry[]) => {
    setRecentLogs(data);
  }, []);

  const handleErrorLogsUpdate = useCallback((data: ErrorLogEntry[]) => {
    setErrorLogs(data);
  }, []);

  const handleAuthLogsUpdate = useCallback((data: AuthLogEntry[]) => {
    setAuthLogs(data);
  }, []);

  const handleRequestMetricsUpdate = useCallback((data: RequestMetric[]) => {
    setRequestMetrics(data);
  }, []);

  const handleLocationsUpdate = useCallback((data: RequestLocation[]) => {
    setLocations(data);
  }, []);

  // Memoize the event handlers
  const memoizedHandleHealthUpdate = React.useCallback(handleMetricsUpdate, []);
  const memoizedHandleMetricsUpdate = React.useCallback(handleMetricsUpdate, []);
  const memoizedHandleAuthLogsUpdate = React.useCallback(handleAuthLogsUpdate, []);

  // Use the memoized handlers in useEffect
  useEffect(() => {
    if (!isConnected) return;
    
    // Add event listeners with memoized handlers
    wsService.on('system:health', memoizedHandleHealthUpdate);
    wsService.on('system:metrics', memoizedHandleMetricsUpdate);
    wsService.on('auth:logs', memoizedHandleAuthLogsUpdate);
    
    // Return cleanup function
    return () => {
      wsService.off('system:health', memoizedHandleHealthUpdate);
      wsService.off('system:metrics', memoizedHandleMetricsUpdate);
      wsService.off('auth:logs', memoizedHandleAuthLogsUpdate);
    };
  }, [isConnected, memoizedHandleHealthUpdate, memoizedHandleMetricsUpdate, memoizedHandleAuthLogsUpdate]);

  // Update local state when props change
  useEffect(() => {
    setHealth(normalizeHealth(initialHealth));
    setRecentLogs(initialRecentLogs);
    setErrorLogs(initialErrorLogs);
    setAuthLogs(initialAuthLogs);
    setRequestMetrics(initialRequestMetrics);
    setLocations(initialLocations);
  }, [initialHealth, initialRecentLogs, initialErrorLogs, initialAuthLogs, initialRequestMetrics, initialLocations]);

  // Add last update indicator
  const renderLastUpdate = () => {
    if (!lastUpdate) return null;
    
    return (
      <Typography variant="caption" color="textSecondary" sx={{ ml: 2 }}>
        Last updated: {lastUpdate.toLocaleTimeString()}
        {!isConnected && ' (Offline)'}
      </Typography>
    );
  };

  // Helper functions
  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <HealthyIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <ErrorIcon color="error" />;
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatChartValue = (name: string | number, value: any) => {
    const numValue = Number(value);
    if (isNaN(numValue)) return value.toString();

    switch (name.toString()) {
      case 'averageResponseTime':
        return `${numValue.toFixed(2)}ms`;
      case 'uniqueIPs':
      case 'requestCount':
      case 'successCount':
      case 'errorCount':
        return numValue.toLocaleString();
      default:
        return value.toString();
    }
  };

  // Transform locations data for the LiveRequestMap
  const mapLocations = (locations || []).map(location => ({
    latitude: location?.latitude || 0,
    longitude: location?.longitude || 0,
    count: location?.count || 1,
    status: 'success' as const, // Default to success
  }));

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3} alignItems="center" sx={{ mb: 2 }}>
          <Grid item xs>
            <Typography variant="h4" component="h1">
              System Dashboard
              {renderLastUpdate()}
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
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* System Health */}
          <Grid item xs={12} md={6} lg={3}>
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
                      icon={getStatusIcon(health.status || 'error')}
                      label={health.status || 'Unknown'}
                      color={
                        health.status === 'healthy'
                          ? 'success'
                          : health.status === 'warning'
                          ? 'warning'
                          : 'error'
                      }
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
          <Grid item xs={12} md={6} lg={3}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                CPU
              </Typography>
              {health?.cpu ? (
                <Box>
                  <Typography variant="h4" color="primary">
                    {health.cpu.usage.toFixed(1)}%
                  </Typography>
                  {health.cpu.cores && (
                    <Typography variant="body2">
                      {health.cpu.cores} Cores
                    </Typography>
                  )}
                  {health.cpu.model && (
                    <Typography variant="body2" noWrap>
                      {health.cpu.model}
                    </Typography>
                  )}
                </Box>
              ) : health?.resources?.cpu ? (
                <Box>
                  <Typography variant="h4" color="primary">
                    {health.resources.cpu.usage.toFixed(1)}%
                  </Typography>
                  <Chip
                    label={health.resources.cpu.status}
                    color={
                      health.resources.cpu.status === 'normal'
                        ? 'success'
                        : health.resources.cpu.status === 'warning'
                        ? 'warning'
                        : 'error'
                    }
                    size="small"
                  />
                </Box>
              ) : (
                <CircularProgress size={24} />
              )}
            </Paper>
          </Grid>

          {/* Memory Usage */}
          <Grid item xs={12} md={6} lg={3}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Memory
              </Typography>
              {health?.memory ? (
                <Box>
                  <Typography variant="h4" color="secondary">
                    {health.memory.usage.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2">
                    {formatBytes(health.memory.free)} free of{' '}
                    {formatBytes(health.memory.total)}
                  </Typography>
                </Box>
              ) : health?.resources?.memory ? (
                <Box>
                  <Typography variant="h4" color="secondary">
                    {health.resources.memory.usage.toFixed(1)}%
                  </Typography>
                  <Chip
                    label={health.resources.memory.status}
                    color={
                      health.resources.memory.status === 'normal'
                        ? 'success'
                        : health.resources.memory.status === 'warning'
                        ? 'warning'
                        : 'error'
                    }
                    size="small"
                  />
                </Box>
              ) : (
                <CircularProgress size={24} />
              )}
            </Paper>
          </Grid>

          {/* Database Status */}
          <Grid item xs={12} md={6} lg={3}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Database
              </Typography>
              {health?.database ? (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body1" sx={{ mr: 1 }}>
                      Status:
                    </Typography>
                    <Chip
                      label={health.database.status}
                      color={
                        health.database.status === 'connected'
                          ? 'success'
                          : 'error'
                      }
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2">
                    {health.database.active_connections} active connections
                  </Typography>
                  <Typography variant="body2">
                    Size: {formatBytes(health.database.db_size)}
                  </Typography>
                </Box>
              ) : health?.services?.database ? (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body1" sx={{ mr: 1 }}>
                      Status:
                    </Typography>
                    <Chip
                      label={health.services.database.status}
                      color={
                        health.services.database.status === 'up'
                          ? 'success'
                          : health.services.database.status === 'degraded'
                          ? 'warning'
                          : 'error'
                      }
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2">
                    Last Check: {formatDate(health.services.database.lastCheck)}
                  </Typography>
                  {health.services.database.message && (
                    <Typography variant="body2">
                      {health.services.database.message}
                    </Typography>
                  )}
                </Box>
              ) : (
                <CircularProgress size={24} />
              )}
            </Paper>
          </Grid>

          {/* Recent Logs */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Recent Logs
              </Typography>
              <TableContainer sx={{ maxHeight: 240 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Level</TableCell>
                      <TableCell>Message</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentLogs && recentLogs.length > 0 ? (
                      recentLogs.map((log, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {formatDistanceToNow(new Date(log.timestamp), {
                              addSuffix: true,
                            })}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={log.level}
                              size="small"
                              color={
                                log.level === 'error'
                                  ? 'error'
                                  : log.level === 'warn'
                                  ? 'warning'
                                  : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell>{log.message}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          {loading ? (
                            <CircularProgress size={20} />
                          ) : (
                            'No logs available'
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Error Logs */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Error Logs
              </Typography>
              <TableContainer sx={{ maxHeight: 240 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Error</TableCell>
                      <TableCell>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {errorLogs && errorLogs.length > 0 ? (
                      errorLogs.map((log, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {formatDistanceToNow(new Date(log.timestamp), {
                              addSuffix: true,
                            })}
                          </TableCell>
                          <TableCell>
                            {log.error && typeof log.error === 'object' 
                              ? log.error.message 
                              : String(log.error)}
                          </TableCell>
                          <TableCell>
                            {log.metadata ? JSON.stringify(log.metadata).substring(0, 50) + '...' : 'No details'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          {loading ? (
                            <CircularProgress size={20} />
                          ) : (
                            'No error logs available'
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Request Metrics Chart */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">API Request Metrics</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant={chartType === 'line' ? 'contained' : 'outlined'}
                    onClick={() => setChartType('line')}
                  >
                    Line
                  </Button>
                  <Button
                    size="small"
                    variant={chartType === 'bar' ? 'contained' : 'outlined'}
                    onClick={() => setChartType('bar')}
                  >
                    Bar
                  </Button>
                  <Button
                    size="small"
                    variant={chartType === 'area' ? 'contained' : 'outlined'}
                    onClick={() => setChartType('area')}
                  >
                    Area
                  </Button>
                </Box>
              </Box>
              <Box sx={{ height: 300 }}>
                {requestMetrics && requestMetrics.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'line' ? (
                      <LineChart
                        data={requestMetrics}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                        />
                        <YAxis />
                        <ChartTooltip
                          formatter={formatChartValue}
                          labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="requestCount"
                          name="Total Requests"
                          stroke={theme.palette.primary.main}
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="successCount"
                          name="Success"
                          stroke={theme.palette.success.main}
                        />
                        <Line
                          type="monotone"
                          dataKey="errorCount"
                          name="Errors"
                          stroke={theme.palette.error.main}
                        />
                        <Line
                          type="monotone"
                          dataKey="averageResponseTime"
                          name="Avg Response Time (ms)"
                          stroke={theme.palette.warning.main}
                        />
                      </LineChart>
                    ) : chartType === 'bar' ? (
                      <BarChart
                        data={requestMetrics}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                        />
                        <YAxis />
                        <ChartTooltip
                          formatter={formatChartValue}
                          labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                        />
                        <Legend />
                        <Bar
                          dataKey="requestCount"
                          name="Total Requests"
                          fill={theme.palette.primary.main}
                        />
                        <Bar
                          dataKey="successCount"
                          name="Success"
                          fill={theme.palette.success.main}
                        />
                        <Bar
                          dataKey="errorCount"
                          name="Errors"
                          fill={theme.palette.error.main}
                        />
                      </BarChart>
                    ) : (
                      <AreaChart
                        data={requestMetrics}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                        />
                        <YAxis />
                        <ChartTooltip
                          formatter={formatChartValue}
                          labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="requestCount"
                          name="Total Requests"
                          stackId="1"
                          fill={alpha(theme.palette.primary.main, 0.6)}
                          stroke={theme.palette.primary.main}
                        />
                        <Area
                          type="monotone"
                          dataKey="successCount"
                          name="Success"
                          stackId="1"
                          fill={alpha(theme.palette.success.main, 0.6)}
                          stroke={theme.palette.success.main}
                        />
                        <Area
                          type="monotone"
                          dataKey="errorCount"
                          name="Errors"
                          stackId="1"
                          fill={alpha(theme.palette.error.main, 0.6)}
                          stroke={theme.palette.error.main}
                        />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <Box
                    sx={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {loading ? (
                      <CircularProgress />
                    ) : (
                      <Typography variant="body1">No metrics available</Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Live Request Map */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Live Request Map
              </Typography>
              <Box sx={{ height: 400 }}>
                <LiveRequestMap 
                  locations={mapLocations} 
                  isLoading={loading}
                />
              </Box>
            </Paper>
          </Grid>

          {/* CRUD Data */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="h6">Quick Access Data</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={onAdd}
                  disabled={fields.length === 0}
                >
                  Add New
                </Button>
              </Box>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {fields.map((field) => (
                        <TableCell key={field.name}>{field.name}</TableCell>
                      ))}
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.length > 0 ? (
                      items.map((item) => (
                        <TableRow key={item.id}>
                          {fields.map((field) => (
                            <TableCell key={`${item.id}-${field.name}`}>
                              {item[field.name] !== undefined
                                ? String(item[field.name])
                                : ''}
                            </TableCell>
                          ))}
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => onEdit(item)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => onDelete(item)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={fields.length + 1}
                          align="center"
                        >
                          {loading ? (
                            <CircularProgress size={20} />
                          ) : (
                            'No data available'
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default SystemDashboard; 