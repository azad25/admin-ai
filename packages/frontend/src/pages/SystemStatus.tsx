import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
  Alert,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  LocationOn as LocationIcon,
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
import { GoogleMap, useLoadScript, HeatmapLayer } from '@react-google-maps/api';
import { systemMetricsService, SystemHealth, LogEntry, ErrorLogEntry, AuthLogEntry, RequestMetric } from '../services/systemMetrics.service';
import type { RequestLocation as ApiRequestLocation } from '../services/systemMetrics.service';
import { formatDistanceToNow } from 'date-fns';
import { LiveRequestMap } from '../components/LiveRequestMap';

const libraries: ("visualization")[] = ["visualization"];

interface HeatmapDataType {
  data: { location: google.maps.LatLng; weight: number; }[];
  options: {
    radius: number;
    opacity: number;
    dissipating: boolean;
    maxIntensity: number;
    gradient: string[];
  };
}

interface RequestLocation extends ApiRequestLocation {
  uniqueIps?: number;
}

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

const SystemStatus: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const [authLogs, setAuthLogs] = useState<AuthLogEntry[]>([]);
  const [requestMetrics, setRequestMetrics] = useState<RequestMetric[]>([]);
  const [locationData, setLocationData] = useState<ApiRequestLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 seconds

  // Initialize Google Maps
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries
  });

  const mapCenter = useMemo(() => ({ lat: 20, lng: 0 }), []); // Adjusted for better initial view
  const mapOptions = useMemo(() => ({
    zoom: 2,
    center: mapCenter,
    minZoom: 2,
    maxZoom: 15,
    styles: [
      {
        featureType: "all",
        elementType: "labels",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#031628" }]
      },
      {
        featureType: "landscape",
        elementType: "geometry",
        stylers: [{ color: "#2c5379" }]
      }
    ]
  }), [mapCenter]);

  const heatmapData = useMemo((): HeatmapDataType | null => {
    if (!locationData.length) return null;
    return {
      data: locationData.map(location => ({
        location: new google.maps.LatLng(location.latitude, location.longitude),
        weight: location.count
      })),
      options: {
        radius: 20,
        opacity: 0.6,
        dissipating: true,
        maxIntensity: Math.max(...locationData.map(loc => loc.count)),
        gradient: [
          "rgba(0, 255, 255, 0)",
          "rgba(0, 255, 255, 1)",
          "rgba(0, 191, 255, 1)",
          "rgba(0, 127, 255, 1)",
          "rgba(0, 63, 255, 1)",
          "rgba(0, 0, 255, 1)",
          "rgba(0, 0, 223, 1)",
          "rgba(0, 0, 191, 1)",
          "rgba(0, 0, 159, 1)",
          "rgba(0, 0, 127, 1)",
          "rgba(63, 0, 91, 1)",
          "rgba(127, 0, 63, 1)",
          "rgba(191, 0, 31, 1)",
          "rgba(255, 0, 0, 1)"
        ]
      }
    };
  }, [locationData]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [
        healthData,
        logsData,
        errorsData,
        authLogsData,
        metricsData,
        locationsData
      ] = await Promise.all([
        systemMetricsService.getSystemHealth(),
        systemMetricsService.getRecentLogs(),
        systemMetricsService.getErrorLogs(),
        systemMetricsService.getAuthLogs(),
        systemMetricsService.getRequestMetrics(),
        systemMetricsService.getLocationHeatmap()
      ]);

      setHealth(healthData);
      setRecentLogs(logsData);
      setErrorLogs(errorsData);
      setAuthLogs(authLogsData);
      setRequestMetrics(metricsData);
      setLocationData(locationsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system metrics');
      console.error('Error fetching system metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

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

  // Map center coordinates (roughly center of the world)
  const defaultCenter = {
    lat: 20,
    lng: 0
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">System Status</Typography>
        <Box>
          <IconButton onClick={fetchData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* System Health Cards */}
      <Grid container spacing={3} mb={3}>
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

        {/* <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Location Activity</Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <LocationIcon color="primary" />
                <Typography variant="body2">
                  {requestMetrics.length > 0 
                    ? Array.from(new Set(requestMetrics.flatMap(m => m.locations))).join(', ') 
                    : 'No recent activity'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid> */}
      </Grid>

      {/* Request Metrics Chart */}
      <Card sx={{ mb: 3 }}>
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
                              {entry.name || ''}: {formatChartValue(entry.name || '', entry.value)}
                            </Typography>
                          ))}
                          {payload[0].payload.topPaths && (
                            <>
                              <Divider sx={{ my: 1 }} />
                              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                Top Paths:
                              </Typography>
                              {payload[0].payload.topPaths.map((path: { path: string; count: number }) => (
                                <Typography key={path.path} variant="body2" sx={{ ml: 1 }}>
                                  {path.path}: {path.count}
                                </Typography>
                              ))}
                            </>
                          )}
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
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="successCount"
                  name="Successful"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="errorCount"
                  name="Errors"
                  stroke="#ff7f7f"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="averageResponseTime"
                  name="Avg Response Time"
                  stroke="#ffc658"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Live Request Map */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Live Request Map</Typography>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Active Locations: {locationData.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Requests: {locationData.reduce((sum, loc) => sum + loc.count, 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Unique IPs: {locationData.reduce((sum, loc) => sum + 1, 0)}
              </Typography>
            </Box>
          </Box>
          <LiveRequestMap locations={locationData} isLoading={loading} />
        </CardContent>
      </Card>

      {/* Logs Tables */}
      <Grid container spacing={3}>
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
    </Box>
  );
};

export default SystemStatus; 