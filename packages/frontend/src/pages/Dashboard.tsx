import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  LocationOn as LocationIcon,
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
} from 'recharts';
import { systemMetricsService, SystemHealth, LogEntry, ErrorLogEntry, AuthLogEntry, RequestMetric } from '../services/systemMetrics.service';
import { formatDistanceToNow } from 'date-fns';
import { LiveRequestMap } from '../components/LiveRequestMap';
import { useSnackbar } from '../contexts/SnackbarContext';
import { crudPageService } from '../services/crudPages';

interface CrudItem {
  id: string;
  pageId: string;
  [key: string]: any;
}

interface CrudField {
  name: string;
  type: string;
  required: boolean;
}

export const Dashboard: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const [authLogs, setAuthLogs] = useState<AuthLogEntry[]>([]);
  const [requestMetrics, setRequestMetrics] = useState<RequestMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CRUD state
  const [items, setItems] = useState<CrudItem[]>([]);
  const [fields, setFields] = useState<CrudField[]>([]);
  const [selectedItem, setSelectedItem] = useState<CrudItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const { showSuccess, showError } = useSnackbar();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Batch API calls with a single request
      const [
        healthData,
        logsData,
        errorsData,
        authLogsData,
        metricsData,
      ] = await Promise.all([
        systemMetricsService.getSystemHealth(),
        systemMetricsService.getRecentLogs(),
        systemMetricsService.getErrorLogs(),
        systemMetricsService.getAuthLogs(),
        systemMetricsService.getRequestMetrics(),
      ]);

      setHealth(healthData);
      setRecentLogs(logsData);
      setErrorLogs(errorsData);
      setAuthLogs(authLogsData);
      setRequestMetrics(metricsData);
    } catch (err) {
      if (err instanceof Error && err.message.includes('429')) {
        setError('Rate limit exceeded. Please wait a moment before refreshing.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch system metrics');
      }
      console.error('Error fetching system metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Increase polling interval to 2 minutes (120000ms)
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, []);

  // Separate effect for CRUD data with a longer interval
  useEffect(() => {
    loadCrudData();
    const interval = setInterval(loadCrudData, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

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

  // CRUD functions
  const loadCrudData = async () => {
    try {
      const pages = await crudPageService.getCrudPages();
      if (pages.length > 0) {
        const firstPage = pages[0];
        const items = await crudPageService.getCrudPageData(firstPage.id);
        setItems(items || []);
        setFields(firstPage.schema.fields || []);
      } else {
        setItems([]);
        setFields([]);
      }
    } catch (err) {
      console.error('Failed to load CRUD data:', err);
      if (err instanceof Error && !err.message.includes('429')) {
        showError('Failed to load items');
      }
      setItems([]);
      setFields([]);
    }
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setFormData({});
    setIsDialogOpen(true);
  };

  const handleEdit = (item: CrudItem) => {
    setSelectedItem(item);
    setFormData(item);
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: CrudItem) => {
    try {
      await crudPageService.deleteCrudPageData(item.pageId, item.id);
      await loadCrudData();
      showSuccess('Item deleted successfully');
    } catch (err) {
      showError('Failed to delete item');
    }
  };

  const handleSave = async () => {
    try {
      if (!items.length) {
        showError('No CRUD pages available. Please create a CRUD page first.');
        setIsDialogOpen(false);
        return;
      }

      const pageId = items[0]?.pageId;
      if (!pageId) {
        showError('Invalid page reference. Please refresh and try again.');
        setIsDialogOpen(false);
        return;
      }

      if (selectedItem) {
        await crudPageService.updateCrudPageData(selectedItem.pageId, selectedItem.id, formData);
        showSuccess('Item updated successfully');
      } else {
        await crudPageService.createCrudPageData(pageId, formData);
        showSuccess('Item created successfully');
      }
      setIsDialogOpen(false);
      await loadCrudData();
    } catch (err) {
      console.error('Failed to save item:', err);
      showError('Failed to save item');
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Add manual refresh function with debounce
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetchData();
      await loadCrudData();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading && !health) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Dashboard</Typography>
        <Box>
          <IconButton 
            onClick={handleManualRefresh} 
            disabled={isRefreshing || loading}
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>
      
      {/* Show rate limit warning if present */}
      {error?.includes('Rate limit exceeded') && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* System Health Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">System Status</Typography>
                {health && getStatusIcon(health.status)}
              </Box>
              <Typography variant="body2" color="text.secondary">
                Uptime: {health?.uptime ? formatDistanceToNow(Date.now() - (health.uptime * 1000)) : 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">CPU Usage</Typography>
              <Typography variant="h4">{health?.cpu.usage.toFixed(2)}%</Typography>
              <Typography variant="body2" color="text.secondary">
                {health?.cpu.cores} Cores | {health?.cpu.model}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Memory</Typography>
              <Typography variant="h4">{health?.memory.usage.toFixed(2)}%</Typography>
              <Typography variant="body2" color="text.secondary">
                {health?.memory.free && formatBytes(health.memory.free)} Free
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Database</Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  label={health?.database.status || 'Unknown'}
                  color={health?.database.status === 'connected' ? 'success' : 'error'}
                  size="small"
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {health?.database.active_connections || 0} Active Connections
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Request Metrics Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Request Metrics</Typography>
              <Box height={400}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={requestMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <Box
                              sx={{
                                backgroundColor: 'background.paper',
                                p: 2,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                              }}
                            >
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                {new Date(label).toLocaleString()}
                              </Typography>
                              {payload.map((entry) => (
                                <Typography
                                  key={entry.name}
                                  variant="body2"
                                  sx={{ color: entry.color }}
                                >
                                  {entry.name || 'Unknown'}: {formatChartValue(entry.name || 'unknown', entry.value)}
                                </Typography>
                              ))}
                            </Box>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="requestCount"
                      name="Total Requests"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="successCount"
                      name="Successful"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="errorCount"
                      name="Errors"
                      stroke="#ff7f7f"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="averageResponseTime"
                      name="Avg Response Time"
                      stroke="#ffc658"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Live Request Map */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Live Request Map</Typography>
              <Box height={400}>
                <LiveRequestMap locations={[]} isLoading={loading} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Logs Tables */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent Logs</Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Level</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell>Location</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentLogs.map((log, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(log.timestamp)}</TableCell>
                        <TableCell>
                          <Chip
                            label={log.level}
                            size="small"
                            color={log.level === 'error' ? 'error' : log.level === 'warn' ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell>{log.message}</TableCell>
                        <TableCell>
                          {log.location && (
                            <Tooltip title={`${log.location.city}, ${log.location.country}`}>
                              <LocationIcon fontSize="small" />
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Error Logs</Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Error</TableCell>
                      <TableCell>Location</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {errorLogs.map((log, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(log.timestamp)}</TableCell>
                        <TableCell>
                          <Tooltip title={log.stack || ''}>
                            <Box>
                              <Typography variant="body2" color="error">
                                {log.error}
                              </Typography>
                              {log.metadata && (
                                <Typography variant="caption" color="text.secondary">
                                  {JSON.stringify(log.metadata)}
                                </Typography>
                              )}
                            </Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {log.location && (
                            <Tooltip title={`${log.location.city}, ${log.location.country}`}>
                              <LocationIcon fontSize="small" />
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Authentication Logs</Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Location</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {authLogs.map((log, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(log.timestamp)}</TableCell>
                        <TableCell>
                          <Chip
                            label={log.action}
                            size="small"
                            color={log.action === 'failed_login' ? 'error' : 'success'}
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title={`IP: ${log.ip}`}>
                            <Typography variant="body2">{log.userId}</Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {log.location && (
                            <Tooltip title={`${log.location.city}, ${log.location.country}`}>
                              <LocationIcon fontSize="small" />
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}; 