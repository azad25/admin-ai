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
  Tab,
  Tabs,
  useTheme,
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
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
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
import { systemMetricsService, LogEntry, ErrorLogEntry, AuthLogEntry, RequestMetric, RequestLocation } from '../services/systemMetrics.service';
import { formatDistanceToNow } from 'date-fns';
import { LiveRequestMap } from '../components/LiveRequestMap';
import { useSnackbar } from '../contexts/SnackbarContext';
import { crudPageService } from '../services/crudPages';
import { authService } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { SystemHealthGauge } from '../components/SystemHealthGauge';
import { AnimatedMetricsCard } from '../components/AnimatedMetricsCard';
import { ErrorAnalysis } from '../components/ErrorAnalysis';
import { AIGlobe } from '../components/3d/AIGlobe';
import { AIActivityTimeline } from '../components/AIActivityTimeline';
import { metricsService } from '../services/metrics.service';
import { wsService } from '../services/websocket.service';
import { useSocket } from '../contexts/SocketContext';
import { SystemMetrics, PerformanceInsight, SecurityInsight, UsageInsight } from '../types/metrics';
import { motion } from 'framer-motion';
import { TabPanel } from '../components/dashboard/TabPanel';
import SystemDashboard from '../components/dashboard/SystemDashboard';
import AIDashboard from '../components/dashboard/AIDashboard';
import CrudDialog from '../components/dashboard/CrudDialog';
import { CrudItem, CrudField } from '../types/crud';

export const Dashboard: React.FC = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const { isConnected } = useSocket();
  
  // Standard Dashboard state
  const [health, setHealth] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const [authLogs, setAuthLogs] = useState<AuthLogEntry[]>([]);
  const [requestMetrics, setRequestMetrics] = useState<RequestMetric[]>([]);
  const [locations, setLocations] = useState<RequestLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // CRUD state
  const [items, setItems] = useState<CrudItem[]>([]);
  const [fields, setFields] = useState<CrudField[]>([]);
  const [selectedItem, setSelectedItem] = useState<CrudItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const { showSuccess, showError } = useSnackbar();
  
  // AI Dashboard state
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [aiRequestMetrics, setAiRequestMetrics] = useState<any[]>([]);
  const [performanceInsights, setPerformanceInsights] = useState<PerformanceInsight | null>(null);
  const [securityInsights, setSecurityInsights] = useState<SecurityInsight | null>(null);
  const [usageInsights, setUsageInsights] = useState<UsageInsight | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      if (!user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }
      
      // Batch API calls with a single request
      const [
        healthData,
        logsData,
        errorsData,
        authLogsData,
        metricsData,
        locationsData,
      ] = await Promise.all([
        systemMetricsService.getSystemHealth(),
        systemMetricsService.getRecentLogs(),
        systemMetricsService.getErrorLogs(),
        systemMetricsService.getAuthLogs(),
        systemMetricsService.getRequestMetrics(),
        systemMetricsService.getLocationHeatmap(),
      ]);

      setHealth(healthData);
      setRecentLogs(logsData || []);
      setErrorLogs(errorsData || []);
      setAuthLogs(authLogsData || []);
      
      // Handle metrics data which might be in different formats
      if (metricsData) {
        if (Array.isArray(metricsData)) {
          setRequestMetrics(metricsData);
        } else if (metricsData.metrics) {
          setRequestMetrics(metricsData.metrics);
        }
      } else {
        setRequestMetrics([]);
      }
      
      setLocations(locationsData || []);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to fetch dashboard data');
      setLoading(false);
    }
  };

  // Fetch AI Dashboard data
  const fetchAIDashboardData = async () => {
    try {
      const [
        healthData,
        metricsData,
        requestMetricsData,
        locationsData,
        performanceData,
        securityData,
        usageData,
      ] = await Promise.allSettled([
        metricsService.getSystemHealth(),
        metricsService.getSystemMetrics(),
        metricsService.getRequestMetrics(),
        metricsService.getLocationHeatmap(),
        metricsService.getPerformanceInsights(),
        metricsService.getSecurityInsights(),
        metricsService.getUsageInsights(),
      ]);

      // Set data only if the promise was fulfilled
      if (healthData.status === 'fulfilled') setHealth(healthData.value);
      if (metricsData.status === 'fulfilled') setMetrics(metricsData.value);
      if (requestMetricsData.status === 'fulfilled') setAiRequestMetrics(Array.isArray(requestMetricsData.value) ? requestMetricsData.value : []);
      if (locationsData.status === 'fulfilled') setLocations(Array.isArray(locationsData.value) ? locationsData.value : []);
      if (performanceData.status === 'fulfilled') setPerformanceInsights(performanceData.value);
      if (securityData.status === 'fulfilled') setSecurityInsights(securityData.value);
      if (usageData.status === 'fulfilled') setUsageInsights(usageData.value);

      // Log any errors
      [healthData, metricsData, requestMetricsData, locationsData, performanceData, securityData, usageData]
        .filter(result => result.status === 'rejected')
        .forEach(result => {
          if (result.status === 'rejected') {
            console.error('Error fetching dashboard data:', result.reason);
          }
        });
    } catch (error) {
      console.error('Error fetching AI dashboard data:', error);
    }
  };

  // Add useEffect for WebSocket event handling
  useEffect(() => {
    // Initial data fetch
    fetchData();
    
    // Set up WebSocket connection and event listeners
    if (wsService.isConnected()) {
      // Request initial data via WebSocket
      wsService.send('metrics:request', {});
      
      // Set up event listeners for real-time updates
      
      // Health updates - support both naming conventions
      const healthUpdateHandler = (data: any) => {
        setHealth(data);
      };
      wsService.on('health_update', healthUpdateHandler);
      wsService.on('health:update', healthUpdateHandler);
      
      // Metrics updates
      const metricsUpdateHandler = (data: any) => {
        setHealth(data.health);
        setMetrics(data.metrics);
      };
      wsService.on('metrics:update', metricsUpdateHandler);
      
      // Logs updates - support both naming conventions
      const logsUpdateHandler = (data: any) => {
        setRecentLogs(data);
      };
      wsService.on('logs_update', logsUpdateHandler);
      wsService.on('logs:update', logsUpdateHandler);
      
      // Error logs updates - support both naming conventions
      const errorLogsUpdateHandler = (data: any) => {
        setErrorLogs(data);
      };
      wsService.on('error_logs_update', errorLogsUpdateHandler);
      wsService.on('error:logs:update', errorLogsUpdateHandler);
      
      // Auth logs updates - support both naming conventions
      const authLogsUpdateHandler = (data: any) => {
        setAuthLogs(data);
      };
      wsService.on('auth_logs_update', authLogsUpdateHandler);
      wsService.on('auth:logs:update', authLogsUpdateHandler);
      
      // Request metrics updates - support both naming conventions
      const requestMetricsUpdateHandler = (data: any) => {
        setRequestMetrics(data);
      };
      wsService.on('request_metrics_update', requestMetricsUpdateHandler);
      wsService.on('request:metrics:update', requestMetricsUpdateHandler);
      
      // Location updates - support both naming conventions
      const locationsUpdateHandler = (data: any) => {
        setLocations(data);
      };
      wsService.on('locations_update', locationsUpdateHandler);
      wsService.on('locations:update', locationsUpdateHandler);
      
      // AI analysis updates
      const metricsAnalysisHandler = (data: any) => {
        // Update AI-related state
        if (data) {
          // Handle AI analysis data
        }
      };
      wsService.on('metrics:analysis', metricsAnalysisHandler);
      
      // Insights updates
      const performanceInsightsHandler = (data: any) => {
        setPerformanceInsights(data);
      };
      wsService.on('insights:performance:update', performanceInsightsHandler);
      
      const securityInsightsHandler = (data: any) => {
        setSecurityInsights(data);
      };
      wsService.on('insights:security:update', securityInsightsHandler);
      
      const usageInsightsHandler = (data: any) => {
        setUsageInsights(data);
      };
      wsService.on('insights:usage:update', usageInsightsHandler);
    }
    
    // Set up polling if WebSocket is not connected
    const pollingInterval = !wsService.isConnected() ? 
      setInterval(() => {
        fetchData();
        if (tabValue === 1) {
          fetchAIDashboardData();
        }
      }, 120000) : null; // Poll every 2 minutes
    
    return () => {
      // Clean up WebSocket listeners
      wsService.off('health_update');
      wsService.off('health:update');
      wsService.off('metrics:update');
      wsService.off('logs_update');
      wsService.off('logs:update');
      wsService.off('error_logs_update');
      wsService.off('error:logs:update');
      wsService.off('auth_logs_update');
      wsService.off('auth:logs:update');
      wsService.off('request_metrics_update');
      wsService.off('request:metrics:update');
      wsService.off('locations_update');
      wsService.off('locations:update');
      wsService.off('metrics:analysis');
      wsService.off('insights:performance:update');
      wsService.off('insights:security:update');
      wsService.off('insights:usage:update');
      
      // Clear polling interval
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [wsService.isConnected()]);

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

  // Map system health status to gauge status for AI Dashboard
  const getGaugeStatus = (status: any['status']): 'healthy' | 'warning' | 'critical' => {
    switch (status) {
      case 'healthy':
        return 'healthy';
      case 'warning':
        return 'warning';
      case 'error':
        return 'critical';
      default:
        return 'warning';
    }
  };

  // Transform locations data for the Globe component
  const globeData = (locations || []).map(location => ({
    latitude: location?.latitude || 0,
    longitude: location?.longitude || 0,
    intensity: Math.min(1, (location?.count || 1) / 100), // Normalize intensity
    city: location?.city || 'Unknown',
    country: location?.country || 'Unknown',
  }));

  // Transform locations data for the LiveRequestMap
  const mapLocations = (locations || []).map(location => ({
    latitude: location?.latitude || 0,
    longitude: location?.longitude || 0,
    count: location?.count || 1,
    status: 'success', // Default to success, can be updated based on actual data
  }));

  // CRUD functions
  const loadCrudData = async () => {
    try {
      const pages = await crudPageService.getCrudPages();
      if (pages.length > 0) {
        const firstPage = pages[0];
        const items = await crudPageService.getCrudPageData(firstPage.id);
        setItems(items || []);
        if (firstPage.schema && firstPage.schema.fields) {
          setFields(firstPage.schema.fields);
        }
      } else {
        setItems([]);
        setFields([]);
      }
    } catch (err) {
      console.error('Error loading CRUD data:', err);
      showError('Failed to load CRUD data');
    }
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setFormData({});
    setIsDialogOpen(true);
  };

  const handleEdit = (item: CrudItem) => {
    setSelectedItem(item);
    setFormData({ ...item });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: CrudItem) => {
    try {
      await crudPageService.deleteCrudPageData(item.pageId, item.id);
      showSuccess('Item deleted successfully');
      loadCrudData();
    } catch (err) {
      console.error('Error deleting item:', err);
      showError('Failed to delete item');
    }
  };

  const handleSave = async () => {
    try {
      if (selectedItem) {
        // Update existing item
        await crudPageService.updateCrudPageData(
          selectedItem.pageId,
          selectedItem.id,
          formData
        );
        showSuccess('Item updated successfully');
      } else if (items.length > 0) {
        // Add new item
        const pageId = items[0].pageId;
        await crudPageService.createCrudPageData(pageId, formData);
        showSuccess('Item created successfully');
      }
      setIsDialogOpen(false);
      loadCrudData();
    } catch (err) {
      console.error('Error saving item:', err);
      showError('Failed to save item');
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleManualRefresh = async () => {
    setLoading(true);
    
    // Request fresh data via WebSocket for immediate update
    if (wsService.isConnected()) {
      wsService.send('metrics:request', {});
      
      // Set a timeout to ensure loading state is cleared even if WebSocket doesn't respond
      setTimeout(() => {
        setLoading(false);
      }, 3000);
    } else {
      // Fallback to API if WebSocket is not connected
      await fetchData();
      if (tabValue === 1) {
        await fetchAIDashboardData();
      }
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
          <Tab label="System Dashboard" />
          <Tab label="AI Dashboard" />
        </Tabs>
      </Box>
      <TabPanel value={tabValue} index={0}>
        <SystemDashboard
          health={health}
          recentLogs={recentLogs}
          errorLogs={errorLogs}
          authLogs={authLogs}
          requestMetrics={requestMetrics}
          locations={locations}
          items={items}
          fields={fields}
          loading={loading}
          error={error}
          onRefresh={handleManualRefresh}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <AIDashboard
          health={health}
          metrics={metrics}
          requestMetrics={requestMetrics}
          aiRequestMetrics={aiRequestMetrics}
          locations={locations}
          performanceInsights={performanceInsights}
          securityInsights={securityInsights}
          usageInsights={usageInsights}
        />
      </TabPanel>

      {/* CRUD Dialog */}
      <CrudDialog
        open={isDialogOpen}
        selectedItem={selectedItem}
        formData={formData}
        fields={fields}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        onFieldChange={handleFieldChange}
      />
    </Box>
  );
}; 