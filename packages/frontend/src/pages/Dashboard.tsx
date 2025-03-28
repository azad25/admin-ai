import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  useTheme,
} from '@mui/material';
import { 
  systemMetricsService, 
  LogEntry as ServiceLogEntry, 
  ErrorLogEntry as ServiceErrorLogEntry, 
  AuthLogEntry as ServiceAuthLogEntry, 
  RequestMetric as ServiceRequestMetric, 
  RequestLocation as ServiceRequestLocation,
} from '../services/systemMetrics.service';
import { useSnackbar } from '../contexts/SnackbarContext';
import { crudPageService } from '../services/crudPages';
import { useAuth } from '../contexts/AuthContext';
import { metricsService } from '../services/metrics.service';
import { wsService } from '../services/websocket.service';
import { useSocket } from '../contexts/SocketContext';
import { 
  SystemMetrics, 
  PerformanceInsight, 
  SecurityInsight, 
  UsageInsight,
  LogEntry as MetricsLogEntry,
  ErrorLogEntry as MetricsErrorLogEntry,
  AuthLogEntry as MetricsAuthLogEntry,
  RequestMetric as MetricsRequestMetric,
  RequestLocation as MetricsRequestLocation,
  SystemHealth as MetricsSystemHealth
} from '../types/metrics';
import UnifiedDashboard from '../components/dashboard/UnifiedDashboard';
import CrudDialog from '../components/dashboard/CrudDialog';
import { CrudItem, CrudField } from '../types/crud';

// Adapter functions to map between incompatible types
const adaptLogEntry = (log: ServiceLogEntry): MetricsLogEntry => ({
  timestamp: log.timestamp,
  level: (log.level as 'info' | 'warn' | 'error') || 'info',
  message: log.message,
  metadata: log.metadata
});

const adaptErrorLogEntry = (log: ServiceErrorLogEntry): MetricsErrorLogEntry => {
  // Handle undefined log
  if (!log) {
    return {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Unknown error',
      metadata: {},
      error: 'Unknown error',
      stack: undefined
    };
  }

  // Extract error message based on error type
  let errorMessage: string;
  let errorStack: string | undefined;

  if (!log.error) {
    errorMessage = log.message || 'Unknown error';
    errorStack = undefined;
  } else if (typeof log.error === 'string') {
    errorMessage = log.error;
    errorStack = undefined;
  } else if (typeof log.error === 'object') {
    errorMessage = log.error.message || 'Unknown error';
    errorStack = log.error.stack;
  } else {
    errorMessage = String(log.error);
    errorStack = undefined;
  }

  return {
    timestamp: log.timestamp || new Date().toISOString(),
    level: (log.level as 'info' | 'warn' | 'error') || 'error',
    message: log.message || errorMessage,
    metadata: log.metadata || {},
    error: errorMessage,
    stack: errorStack
  };
};

const adaptAuthLogEntry = (log: ServiceAuthLogEntry): any => ({
  timestamp: log.timestamp,
  message: log.message,
  userId: log.user?.id || '',
  action: (log.action as 'login' | 'logout' | 'failed_login' | 'register') || 'login',
  ip: log.location?.city || '',
  userAgent: navigator.userAgent,
  level: (log.level as 'info' | 'warn' | 'error') || 'info'
});

const adaptRequestMetric = (metric: ServiceRequestMetric): MetricsRequestMetric => ({
  timestamp: metric.timestamp,
  path: `/api/${metric.locations?.[0] || 'unknown'}`,
  method: 'GET',
  statusCode: 200,
  duration: metric.averageResponseTime,
  ip: '127.0.0.1'
});

const adaptRequestLocation = (location: ServiceRequestLocation): MetricsRequestLocation => ({
  ip: location.ip,
  latitude: location.latitude,
  longitude: location.longitude,
  count: location.count,
  lastSeen: location.lastSeen,
  city: location.city,
  country: location.country,
  uniqueIps: 1  // Default value since it's missing in the service type
});

interface RevenueCategory {
  name: string;
  amount: number;
  change: number;
}

interface RevenueMetrics {
  totalRevenue: number;
  monthlyChange: number;
  categories: RevenueCategory[];
}

// Fix the CrudField interface
interface PageSchema {
  type: string;
  properties: Record<string, any>;
  tableName: string;
  description: string;
  fields?: CrudField[];
}

interface CrudPage {
  id: string;
  schema: PageSchema;
  // other properties
}

// Add these interfaces at an appropriate location in the file
interface HealthMetricsProps {
  health: MetricsSystemHealth | null;
  metrics: SystemMetrics | null;
}

interface LogDataProps {
  recentLogs: MetricsLogEntry[];
  errorLogs: MetricsErrorLogEntry[];
  authLogs: MetricsAuthLogEntry[];
}

interface RequestDataProps {
  requestMetrics: MetricsRequestMetric[];
  locations: MetricsRequestLocation[];
}

interface AnalyticsProps {
  errorDistribution: any[]; // Use the appropriate type
  recentOrders: any[]; // Use the appropriate type
  userAnalytics: any; // Use the appropriate type
  revenueMetrics: any; // Use the appropriate type
}

interface AIDataProps {
  aiRequestMetrics: any[];
  performanceInsights: PerformanceInsight[];
  securityInsights: SecurityInsight[];
  usageInsights: UsageInsight[];
}

interface CrudDataProps {
  items: CrudItem[];
  fields: CrudField[];
}

interface StatusCallbackProps {
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onAdd: () => void;
  onEdit: (item: CrudItem) => void;
  onDelete: (item: CrudItem) => void;
}

export const Dashboard: React.FC = () => {
  const theme = useTheme();
  
  // Tab state
  const [tabValue] = useState<number>(0);

  // Unified Dashboard state
  const [health, setHealth] = useState<MetricsSystemHealth | null>(null);
  const [recentLogs, setRecentLogs] = useState<MetricsLogEntry[]>([]);
  const [errorLogs, setErrorLogs] = useState<MetricsErrorLogEntry[]>([]);
  const [authLogs, setAuthLogs] = useState<MetricsAuthLogEntry[]>([]);
  const [requestMetrics, setRequestMetrics] = useState<MetricsRequestMetric[]>([]);
  const [locations, setLocations] = useState<MetricsRequestLocation[]>([]);
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
  const [performanceInsights, setPerformanceInsights] = useState<PerformanceInsight[]>([]);
  const [securityInsights, setSecurityInsights] = useState<SecurityInsight[]>([]);
  const [usageInsights, setUsageInsights] = useState<UsageInsight[]>([]);
  
  // State for error distribution analytics
  const [errorDistribution, setErrorDistribution] = useState<any[]>([]);
  // State for recent orders/transactions
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  // User analytics
  const [userAnalytics, setUserAnalytics] = useState({
    totalUsers: 0,
    deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 }
  });
  // Revenue metrics
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics>({
    totalRevenue: 0,
    monthlyChange: 0,
    categories: []
  });

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
      
      // Batch API calls for unified dashboard
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

      // Use adapter functions to convert types
      setHealth(healthData as unknown as MetricsSystemHealth);
      setRecentLogs((logsData || []).map(adaptLogEntry));
      setErrorLogs((errorsData || []).map(adaptErrorLogEntry));
      setAuthLogs((authLogsData || []).map(adaptAuthLogEntry));
      
      // Handle metrics data which might be in different formats
      if (metricsData) {
        if (Array.isArray(metricsData)) {
          setRequestMetrics(metricsData.map(adaptRequestMetric));
        } else if (typeof metricsData === 'object' && metricsData !== null) {
          // Handle both array and object formats
          const metrics = 'metrics' in metricsData 
            ? (metricsData as { metrics: ServiceRequestMetric[] }).metrics
            : [metricsData as ServiceRequestMetric];
          
          setRequestMetrics(metrics.map(adaptRequestMetric));
        } else {
          setRequestMetrics([]);
        }
      } else {
        setRequestMetrics([]);
      }
      
      setLocations((locationsData || []).map(adaptRequestLocation));
      
      // Fetch AI dashboard data
      const [aiMetricsData, performanceData, securityData, usageData] = await Promise.allSettled([
        metricsService.getSystemMetrics(),
        metricsService.getPerformanceInsights(),
        metricsService.getSecurityInsights(),
        metricsService.getUsageInsights(),
      ]);

      if (aiMetricsData.status === 'fulfilled') setMetrics(aiMetricsData.value);
      if (performanceData.status === 'fulfilled') {
        // Ensure performanceInsights is an array
        const insightsData = performanceData.value;
        setPerformanceInsights(Array.isArray(insightsData) ? insightsData : [insightsData].filter(Boolean));
      }
      if (securityData.status === 'fulfilled') {
        // Ensure securityInsights is an array
        const insightsData = securityData.value;
        setSecurityInsights(Array.isArray(insightsData) ? insightsData : [insightsData].filter(Boolean));
      }
      if (usageData.status === 'fulfilled') {
        // Ensure usageInsights is an array
        const insightsData = usageData.value;
        setUsageInsights(Array.isArray(insightsData) ? insightsData : [insightsData].filter(Boolean));
      }
      
      // Mock data for dashboard elements from reference image
      // This would normally come from API calls
      setErrorDistribution([
        { type: 'Authentication', count: 145, trend: 'up' },
        { type: 'Server', count: 78, trend: 'down' },
        { type: 'Network', count: 92, trend: 'stable' },
        { type: 'Client', count: 110, trend: 'up' }
      ]);
      
      setRecentOrders([
        { id: '#1231', date: '2024-01-15', status: 'Shipped', amount: 245.99 },
        { id: '#1232', date: '2024-01-14', status: 'Processing', amount: 125.50 },
        { id: '#1233', date: '2024-01-13', status: 'Delivered', amount: 345.00 },
        { id: '#1234', date: '2024-01-12', status: 'Pending', amount: 89.99 },
        { id: '#1235', date: '2024-01-11', status: 'Shipped', amount: 199.50 }
      ]);
      
      setUserAnalytics({
        totalUsers: 23648,
        deviceBreakdown: {
          desktop: 15624,
          mobile: 5546,
          tablet: 2478
        }
      });
      
      setRevenueMetrics({
        totalRevenue: 240800,
        monthlyChange: 8.5,
        categories: [
          { name: 'Subscriptions', amount: 144600, change: 5.2 },
          { name: 'Services/Licenses', amount: 67900, change: 7.5 },
          { name: 'Products', amount: 28300, change: 2.1 }
        ]
      } as RevenueMetrics);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to fetch dashboard data');
      setLoading(false);
    }
  };

  // Fetch AI Dashboard specific data
  const fetchAIDashboardData = async () => {
    try {
      setLoading(true);
      
      const [aiMetricsData, requestMetricsData, performanceData, securityData, usageData] = await Promise.allSettled([
        metricsService.getSystemMetrics(),
        metricsService.getRequestMetrics(),
        metricsService.getPerformanceInsights(),
        metricsService.getSecurityInsights(),
        metricsService.getUsageInsights(),
      ]);

      if (aiMetricsData.status === 'fulfilled') setMetrics(aiMetricsData.value);
      if (requestMetricsData.status === 'fulfilled') setAiRequestMetrics(Array.isArray(requestMetricsData.value) ? requestMetricsData.value : []);
      if (performanceData.status === 'fulfilled') {
        // Ensure performanceInsights is an array
        const insightsData = performanceData.value;
        setPerformanceInsights(Array.isArray(insightsData) ? insightsData : [insightsData].filter(Boolean));
      }
      if (securityData.status === 'fulfilled') {
        // Ensure securityInsights is an array
        const insightsData = securityData.value;
        setSecurityInsights(Array.isArray(insightsData) ? insightsData : [insightsData].filter(Boolean));
      }
      if (usageData.status === 'fulfilled') {
        // Ensure usageInsights is an array
        const insightsData = usageData.value;
        setUsageInsights(Array.isArray(insightsData) ? insightsData : [insightsData].filter(Boolean));
      }

      setLoading(false);

      // Log any errors
      [aiMetricsData, requestMetricsData, performanceData, securityData, usageData]
        .filter(result => result.status === 'rejected')
        .forEach(result => {
          if (result.status === 'rejected') {
            console.error('Error fetching AI dashboard data:', result.reason);
          }
        });
    } catch (error) {
      console.error('Error fetching AI dashboard data:', error);
      setError('Failed to load AI dashboard data');
      setLoading(false);
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
        try {
          if (Array.isArray(data)) {
            setRequestMetrics(data.map(adaptRequestMetric));
          } else if (data && typeof data === 'object') {
            // Handle both array and object formats similar to fetchData
            if ('metrics' in data) {
              const metrics2 = data.metrics;
              // Ensure metrics2 is an array before calling map
              if (Array.isArray(metrics2)) {
                setRequestMetrics(metrics2.map(adaptRequestMetric));
              } else {
                console.warn('Received metrics data is not an array:', metrics2);
                setRequestMetrics([]);
              }
            } else {
              setRequestMetrics([data].filter(Boolean).map(adaptRequestMetric));
            }
          } else {
            console.warn('Received invalid metrics data:', data);
            setRequestMetrics([]);
          }
        } catch (error) {
          console.error('Error processing metrics data:', error);
          setRequestMetrics([]);
        }
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
      // Clean up WebSocket listeners with empty callback if necessary
      wsService.off('health_update', () => {});
      wsService.off('health:update', () => {});
      wsService.off('metrics:update', () => {});
      wsService.off('logs_update', () => {});
      wsService.off('logs:update', () => {});
      wsService.off('error_logs_update', () => {});
      wsService.off('error:logs:update', () => {});
      wsService.off('auth_logs_update', () => {});
      wsService.off('auth:logs:update', () => {});
      wsService.off('request_metrics_update', () => {});
      wsService.off('request:metrics:update', () => {});
      wsService.off('locations_update', () => {});
      wsService.off('locations:update', () => {});
      wsService.off('metrics:analysis', () => {});
      wsService.off('insights:performance:update', () => {});
      wsService.off('insights:security:update', () => {});
      wsService.off('insights:usage:update', () => {});
      
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

  // CRUD functions
  const loadCrudData = async () => {
    try {
      const pages = await crudPageService.getCrudPages();
      if (pages.length > 0) {
        const firstPage = pages[0] as CrudPage;
        const items = await crudPageService.getCrudPageData(firstPage.id);
        setItems(items || []);
        
        // Access fields with proper typing
        const schemaFields = firstPage.schema.fields || [];
        
        if (schemaFields.length > 0) {
          setFields(schemaFields);
        } else if (firstPage.schema.properties) {
          // If no fields property but has properties, create fields from properties
          const derivedFields = Object.entries(firstPage.schema.properties).map(([key, value]) => ({
            name: key,
            type: typeof value === 'object' && value !== null && 'type' in value 
              ? String((value as any).type) 
              : 'string',
            required: true
          }));
          setFields(derivedFields);
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
      {/* 
        TypeScript has a limitation with complex union types.
        We're using type assertion to 'any' to bypass TypeScript's union type complexity limitation.
        This won't affect runtime behavior, it just tells TypeScript to skip type checking here.
        
        Error: Expression produces a union type that is too complex to represent.
      */}
      <UnifiedDashboard 
        {...{
          health,
          metrics,
          recentLogs,
          errorLogs,
          authLogs,
          requestMetrics,
          locations,
          errorDistribution,
          recentOrders,
          userAnalytics,
          revenueMetrics,
          aiRequestMetrics: aiRequestMetrics || [],
          performanceInsights: performanceInsights || [],
          securityInsights: securityInsights || [],
          usageInsights: usageInsights || [],
          items,
          fields,
          loading,
          error,
          onRefresh: handleManualRefresh,
          onAdd: handleAdd,
          onEdit: handleEdit,
          onDelete: handleDelete
        } as any} 
      />

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