import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Box,
  Tab,
  Tabs,
  Typography,
  Paper,
  Divider,
  useMediaQuery,
  Button,
  Card,
  CardContent,
  styled,
  useTheme,
  alpha,
  CircularProgress
} from '@mui/material';
import {
  SystemHealth,
  LogEntry,
  ErrorLogEntry,
  AuthLogEntry,
  RequestMetric,
  RequestLocation,
  SystemMetrics,
  PerformanceInsight,
  SecurityInsight,
  UsageInsight
} from '../../types/metrics';
import { CrudItem, CrudField as ImportedCrudField } from '../../types/crud';
import { useSocket } from '../../contexts/SocketContext';
import { DashboardHeader } from './DashboardHeader';
import { SimpleErrorItem } from './SimpleErrorAnalysis';
import SystemHealthPanel from './panels/SystemHealthPanel';
import MetricsCardPanel from './panels/MetricsCardPanel';
import LogsPanel from './panels/LogsPanel';
import RequestMetricsPanel from './panels/RequestMetricsPanel';
import { MapPanel } from './panels/MapPanel';
import AIHealthPanel from './panels/AIHealthPanel';
import AIMetricsPanel from './panels/AIMetricsPanel';
import AIGlobePanel from './panels/AIGlobePanel';
import AIActivityPanel from './panels/AIActivityPanel';
import PerformanceInsightsPanel from './panels/PerformanceInsightsPanel';
import DataManagementPanel from './panels/DataManagementPanel';
import SecurityInsightsPanel from './panels/SecurityInsightsPanel';
import UsageInsightsPanel from './panels/UsageInsightsPanel';
import { FixedErrorAnalysis, FixedErrorItem } from './FixedErrorAnalysis';
import ModernChartsPanel from './panels/SystemWidgets';
import SystemWidgets from './panels/SystemWidgets';
import { useDashboardData } from '../../hooks/useDashboardData';

// Define interfaces
interface AIRequestMetric {
  timestamp: string;
  requestId: string;
  type: string;
  status: string;
  duration: number;
}

// Use a different name for the local interface to avoid conflict
interface DashboardCrudField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  label: string;
}

// Define type interfaces
export interface ErrorItem {
  type: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AIHealthData {
  status: 'healthy' | 'warning' | 'critical';
  score: number;
  analysis: string;
}

export interface AIInteraction {
  latitude: number;
  longitude: number;
  intensity: number;
  city: string;
  country: string;
}

export interface AIActivity {
  timestamp: string;
  path: string;
  method: string;
  statusCode: number;
  duration: number;
  ip: string;
  location: {
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
}

export interface UnifiedDashboardProps {
  metrics: SystemMetrics | null;
  health: SystemHealth | null;
  locations: RequestLocation[];
  errorDistribution: ErrorItem[] | null;
  recentLogs: LogEntry[];
  errorLogs: ErrorLogEntry[];
  authLogs: AuthLogEntry[];
  requestMetrics: RequestMetric[];
  recentOrders: Array<{
    id: string;
    date: string;
    status: string;
    amount: number;
  }>;
  userAnalytics: {
    totalUsers: number;
    deviceBreakdown: {
      desktop: number;
      mobile: number;
      tablet: number;
    }
  };
  revenueMetrics: {
    totalRevenue: number;
    monthlyChange: number;
    categories: Array<{
      name: string;
      amount: number;
      change: number;
    }>
  };
  aiRequestMetrics: AIRequestMetric[];
  performanceInsights: PerformanceInsight[];
  securityInsights: SecurityInsight[];
  usageInsights: UsageInsight[];
  items: CrudItem[];
  fields: ImportedCrudField[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onAdd: () => void;
  onEdit: (item: CrudItem) => void;
  onDelete: (item: CrudItem) => void;
}

// Create styled components
const DashboardCard = styled(Card)(({ theme }) => ({
  height: '100%',
  backgroundColor: theme.palette.background.paper,
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    boxShadow: '0 6px 25px rgba(0,0,0,0.3)',
  }
}));

const CardHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
}));

const CardTitle = styled(Typography)({
  fontWeight: 600,
  fontSize: '1.05rem'
});

const CardBody = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  height: 'calc(100% - 64px)', // Subtract header height
  overflow: 'auto'
}));

const HeaderButton = styled(Button)(({ theme }) => ({
  fontWeight: 500,
  textTransform: 'none',
  borderRadius: 8,
  padding: theme.spacing(0.75, 1.5),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  boxShadow: 'none',
  '&:hover': {
    boxShadow: 'none',
  }
}));

const StyledAnalyticsHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
}));

const MetricValue = styled(Typography)(({ theme }) => ({
  fontSize: '2rem',
  fontWeight: 600,
  marginBottom: theme.spacing(0.5),
}));

const MetricLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  color: theme.palette.text.secondary,
}));

const ChangeIndicator = styled(Box)<{ trend: 'up' | 'down' | 'stable' }>(({ theme, trend }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 4,
  padding: theme.spacing(0.25, 0.75),
  fontSize: '0.75rem',
  fontWeight: 500,
  backgroundColor: trend === 'up'
    ? alpha(theme.palette.success.main, 0.1)
    : trend === 'down'
      ? alpha(theme.palette.error.main, 0.1)
      : alpha(theme.palette.info.main, 0.1),
  color: trend === 'up'
    ? theme.palette.success.main
    : trend === 'down'
      ? theme.palette.error.main
      : theme.palette.info.main,
  marginLeft: theme.spacing(1),
}));

const MapContainer = styled(Box)({
  height: 450
});

// Modify LogEntry to match the component interface
const mapLogsToComponentFormat = (logs: LogEntry[]): import('./panels/LogsPanel').LogEntry[] => {
  return logs.map((log, index) => ({
    id: `log-${index}`,
    timestamp: log.timestamp,
    level: (log.level || 'info') as 'info' | 'warn' | 'error' | 'debug',
    message: log.message,
    source: 'system'
  }));
};

// Main component
function UnifiedDashboard(props: UnifiedDashboardProps) {
  const {
    items,
    fields,
    loading: propsLoading,
    error: propsError,
    onRefresh,
    onAdd,
    onEdit,
    onDelete
  } = props;

  const theme = useTheme();
  const { isConnected } = useSocket();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  // Get real-time dashboard data
  const {
    health: healthState,
    metrics: metricsState,
    recentLogs: recentLogsState,
    errorLogs: errorLogsState,
    authLogs: authLogsState,
    requestMetrics: requestMetricsState,
    locations: locationsState,
    performanceInsights: performanceInsightsState,
    securityInsights: securityInsightsState,
    usageInsights: usageInsightsState,
    loading: dataLoading,
    error: dataError
  } = useDashboardData();

  // Chart type state for request metrics
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  // Map the imported CrudField to the local CrudField type
  const mappedFields: DashboardCrudField[] = React.useMemo(() => {
    return (fields || []).map(field => ({
      id: field.name,
      name: field.name,
      type: field.type,
      required: field.required,
      label: field.name
    }));
  }, [fields]);

  // Update lastUpdate when data changes
  useEffect(() => {
    setLastUpdate(new Date());
  }, [healthState, metricsState, recentLogsState, errorLogsState, authLogsState, requestMetricsState, locationsState]);

  // Format trend for display
  const formatTrend = (value: number, isPercentage = false): { text: string, trend: 'up' | 'down' | 'stable' } => {
    const text = isPercentage ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%` : `${value > 0 ? '+' : ''}${value}`;
    const trend = value > 0 ? 'up' : value < 0 ? 'down' : 'stable';
    return { text, trend };
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Handle chart type change
  const handleChartTypeChange = (type: 'line' | 'bar') => {
    setChartType(type);
  };

  // Show loading state
  if (propsLoading || dataLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Show error state
  if (propsError || dataError) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <Typography color="error">
            {propsError || dataError || 'An error occurred while loading the dashboard'}
          </Typography>
        </Box>
      </Container>
    );
  }

  // Update the logs format
  const formattedLogs = React.useMemo(() => {
    return mapLogsToComponentFormat(recentLogsState.filter(log => log.level !== 'debug'));
  }, [recentLogsState]);

  // Add status to locations for MapPanel
  const enhancedLocations = React.useMemo(() => {
    return locationsState.map(location => ({
      ...location,
      status: 'success' as 'success' | 'warning' | 'error'
    }));
  }, [locationsState]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Main dashboard content */}
      <Grid container spacing={3}>
        <Grid container spacing={2} mt={2}>
          {/* Add AIGlobe visualization */}
          <Grid item xs={12} md={7} lg={7}>
            <DashboardCard>
              <CardHeader>
                <CardTitle variant="h6">Global AI Activity</CardTitle>
              </CardHeader>
              <CardBody sx={{ height: 400, p: 0 }}>
                <AIGlobePanel
                  globeData={locationsState.map(loc => ({
                    latitude: loc.latitude || 0,
                    longitude: loc.longitude || 0,
                    intensity: 0.7,
                    city: loc.city || '',
                    country: loc.country || ''
                  }))}
                />
              </CardBody>
            </DashboardCard>
          </Grid>
          {/* Map Row */}
          <Grid item xs={12} md={5} lg={5}>
            <MapContainer>
              <MapPanel />
            </MapContainer>
          </Grid>

          {/* System Widgets */}
          <Grid item xs={12} md={12} lg={12}>
            <SystemWidgets />
          </Grid>
          {/* Top row */}
          <Grid item xs={12} md={5} lg={5}>
            <DashboardCard>
              <CardHeader>
                <CardTitle variant="h6">Total revenue</CardTitle>
                <Box display="flex" alignItems="center">
                  <Typography variant="h3" fontWeight="600">
                    {formatCurrency(metricsState?.revenue?.total || 0)}
                  </Typography>
                  <ChangeIndicator trend={metricsState?.revenue?.monthlyChange > 0 ? 'up' : 'down'}>
                    {metricsState?.revenue?.monthlyChange > 0 ? '+' : ''}{metricsState?.revenue?.monthlyChange || 0}%
                  </ChangeIndicator>
                </Box>
              </CardHeader>
              <CardBody sx={{ height: 310, pb: 3 }}>
                <RequestMetricsPanel
                  requestMetrics={requestMetricsState}
                  loading={dataLoading}
                  chartType={chartType}
                  onChartTypeChange={handleChartTypeChange}
                />
              </CardBody>
            </DashboardCard>
          </Grid>
        </Grid>

        <Grid item xs={12} lg={8}>
          <DashboardCard>
            <CardHeader>
              <CardTitle variant="h6">Popular categories</CardTitle>
              <Box>
                <HeaderButton size="small" variant="outlined">
                  Export
                </HeaderButton>
              </Box>
            </CardHeader>
            <CardBody>
              <Box height="310px" display="flex" flexDirection="column" justifyContent="space-between">
                {(metricsState?.revenue?.categories || []).map((category: { name: string; amount: number; change: number }, index: number) => (
                  <Box key={index} mb={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="body2" color="text.secondary">
                        {category.name}
                      </Typography>
                      <ChangeIndicator trend={category.change > 0 ? 'up' : 'down'}>
                        {category.change > 0 ? '+' : ''}{category.change}%
                      </ChangeIndicator>
                    </Box>
                    <Typography variant="h6">
                      {formatCurrency(category.amount)}
                    </Typography>
                    <Divider sx={{ mt: 1.5 }} />
                  </Box>
                ))}
              </Box>
            </CardBody>
          </DashboardCard>
        </Grid>

        {/* Map Row */}
        <Grid item xs={12} md={8}>
          <Box sx={{ height: 400 }}>
            <MapPanel />
          </Box>
        </Grid>

        {/* Stats beside map */}
        <Grid item xs={12} md={4}>
          <DashboardCard>
            <CardHeader>
              <CardTitle variant="h6">Total users</CardTitle>
            </CardHeader>
            <CardBody>
              <Box textAlign="center" py={4}>
                <Typography variant="h2" fontWeight="600" component="div">
                  {metricsState?.userAnalytics?.totalUsers.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Users by device
                </Typography>
              </Box>
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Desktop users</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {metricsState?.userAnalytics?.deviceBreakdown.desktop.toLocaleString()}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Phone app users</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {metricsState?.userAnalytics?.deviceBreakdown.mobile.toLocaleString()}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Laptop users</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {metricsState?.userAnalytics?.deviceBreakdown.tablet.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardBody>
          </DashboardCard>
        </Grid>

        {/* Metrics Section */}
        <Grid item xs={12} md={6} lg={4}>
          <DashboardCard>
            <CardHeader>
              <CardTitle variant="h6">Recent Orders</CardTitle>
            </CardHeader>
            <CardBody>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>Order</th>
                      <th style={{ textAlign: 'left', padding: '8px', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '8px', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>Status</th>
                      <th style={{ textAlign: 'right', padding: '8px', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {props.recentOrders.map((order, index) => (
                      <tr key={order.id}>
                        <td style={{ padding: '8px', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}` }}>{order.id}</td>
                        <td style={{ padding: '8px', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}` }}>
                          {new Date(order.date).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '8px', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}` }}>
                          <Box sx={{
                            display: 'inline-block',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            bgcolor: order.status === 'Delivered' ? alpha(theme.palette.success.main, 0.1) :
                              order.status === 'Shipped' ? alpha(theme.palette.info.main, 0.1) :
                                order.status === 'Processing' ? alpha(theme.palette.warning.main, 0.1) :
                                  alpha(theme.palette.error.main, 0.1),
                            color: order.status === 'Delivered' ? theme.palette.success.main :
                              order.status === 'Shipped' ? theme.palette.info.main :
                                order.status === 'Processing' ? theme.palette.warning.main :
                                  theme.palette.error.main,
                          }}>
                            {order.status}
                          </Box>
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}` }}>
                          ${order.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </CardBody>
          </DashboardCard>
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <DashboardCard>
            <CardHeader>
              <CardTitle variant="h6">System Health</CardTitle>
            </CardHeader>
            <CardBody>
              <SystemHealthPanel health={healthState} loading={dataLoading} />
            </CardBody>
          </DashboardCard>
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <DashboardCard>
            <CardHeader>
              <CardTitle variant="h6">Error Distribution</CardTitle>
            </CardHeader>
            <CardBody>
              <FixedErrorAnalysis
                title=""
                data={props.errorDistribution as unknown as FixedErrorItem[] | null}
                icon={null}
              />
            </CardBody>
          </DashboardCard>
        </Grid>

        {/* Activity and Logs */}
        <Grid item xs={12} lg={8}>
          <DashboardCard>
            <CardHeader>
              <CardTitle variant="h6">Recent Activity</CardTitle>
            </CardHeader>
            <CardBody sx={{ height: 300 }}>
              <LogsPanel logs={formattedLogs} />
            </CardBody>
          </DashboardCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <DashboardCard>
            <CardHeader>
              <CardTitle variant="h6">Performance Insights</CardTitle>
            </CardHeader>
            <CardBody>
              <PerformanceInsightsPanel performanceInsights={performanceInsightsState} />
            </CardBody>
          </DashboardCard>
        </Grid>

        {/* Security and Management */}
        <Grid item xs={12} md={6}>
          <DashboardCard>
            <CardHeader>
              <CardTitle variant="h6">Security Insights</CardTitle>
            </CardHeader>
            <CardBody>
              <SecurityInsightsPanel securityInsights={securityInsightsState} />
            </CardBody>
          </DashboardCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <DashboardCard>
            <CardHeader>
              <CardTitle variant="h6">Data Management</CardTitle>
            </CardHeader>
            <CardBody>
              <DataManagementPanel
                items={items}
                fields={mappedFields}
                onAdd={onAdd}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </CardBody>
          </DashboardCard>
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <DashboardCard>
            <CardHeader>
              <CardTitle variant="h6">User Analytics</CardTitle>
            </CardHeader>
            <CardBody sx={{ height: 450 }}>
              <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="medium" gutterBottom>
                    {metricsState?.userAnalytics?.totalUsers.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Active Users
                  </Typography>

                  <Box sx={{ mt: 4 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Device Breakdown
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Desktop</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {metricsState?.userAnalytics?.deviceBreakdown.desktop.toLocaleString()} ({Math.round(metricsState?.userAnalytics?.deviceBreakdown.desktop / metricsState?.userAnalytics?.totalUsers * 100)}%)
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Mobile</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {metricsState?.userAnalytics?.deviceBreakdown.mobile.toLocaleString()} ({Math.round(metricsState?.userAnalytics?.deviceBreakdown.mobile / metricsState?.userAnalytics?.totalUsers * 100)}%)
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Tablet</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {metricsState?.userAnalytics?.deviceBreakdown.tablet.toLocaleString()} ({Math.round(metricsState?.userAnalytics?.deviceBreakdown.tablet / metricsState?.userAnalytics?.totalUsers * 100)}%)
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </CardBody>
          </DashboardCard>
        </Grid>

        <Grid item xs={12}>
          <DashboardCard>
            <CardHeader>
              <CardTitle variant="h6">Analytics Dashboard</CardTitle>
            </CardHeader>
            <CardBody sx={{ p: 0 }}>
              <ModernChartsPanel />
            </CardBody>
          </DashboardCard>
        </Grid>
      </Grid>

      {/* Key metrics cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { 
            title: 'Active Users', 
            value: metricsState?.userAnalytics?.totalUsers?.toLocaleString() || '0', 
            trend: '+12%', 
            icon: '👥' 
          },
          { 
            title: 'Total Revenue', 
            value: formatCurrency(metricsState?.revenue?.total || 0), 
            trend: formatTrend(metricsState?.revenue?.monthlyChange || 0, true).text, 
            icon: '💰' 
          },
          { 
            title: 'System Health', 
            value: `${healthState?.score || 0}%`, 
            trend: healthState?.status || 'N/A', 
            icon: '⚡' 
          },
          { 
            title: 'Active Sessions', 
            value: metricsState?.activeUsers?.toLocaleString() || '0', 
            trend: '+5%', 
            icon: '🔌' 
          },
        ].map((metric, index) => (
          <Grid item xs={6} md={3} key={index}>
            <DashboardCard>
              <CardBody>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {metric.title}
                  </Typography>
                  <Box
                    sx={{
                      height: 36,
                      width: 36,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      background: theme => alpha(theme.palette.primary.main, 0.1)
                    }}
                  >
                    {metric.icon}
                  </Box>
                </Box>
                <Typography variant="h5" fontWeight="bold">
                  {metric.value}
                </Typography>
                <Typography
                  variant="body2"
                  color={metric.trend?.includes('+') ? 'success.main' : metric.trend?.includes('-') ? 'error.main' : 'text.secondary'}
                  sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}
                >
                  {metric.trend}
                </Typography>
              </CardBody>
            </DashboardCard>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export default UnifiedDashboard;