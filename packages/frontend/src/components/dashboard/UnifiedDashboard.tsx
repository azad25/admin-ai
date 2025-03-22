import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Box,
  Tab,
  Tabs,
  Typography,
  styled
} from '@mui/material';
import { 
  BugReport,
} from '@mui/icons-material';
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
import { CrudItem } from '../../types/crud';
import { useSocket } from '../../hooks';
import { DashboardHeader } from './DashboardHeader';
import { SimpleErrorItem } from './SimpleErrorAnalysis';
import SystemHealthPanel from './panels/SystemHealthPanel';
import MetricsCardPanel from './panels/MetricsCardPanel';
import LogsPanel from './panels/LogsPanel';
import RequestMetricsPanel from './panels/RequestMetricsPanel';
import MapPanel from './panels/MapPanel';
import AIHealthPanel from './panels/AIHealthPanel';
import AIMetricsPanel from './panels/AIMetricsPanel';
import AIGlobePanel from './panels/AIGlobePanel';
import AIActivityPanel from './panels/AIActivityPanel';
import PerformanceInsightsPanel from './panels/PerformanceInsightsPanel';
import DataManagementPanel from './panels/DataManagementPanel';
import SecurityInsightsPanel from './panels/SecurityInsightsPanel';
import UsageInsightsPanel from './panels/UsageInsightsPanel';
import { FixedErrorAnalysis, FixedErrorItem } from './FixedErrorAnalysis';

// Define interfaces
interface AIRequestMetric {
  timestamp: string;
  requestId: string;
  type: string;
  status: string;
  duration: number;
}

interface CrudField {
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
  latestLogs: LogEntry[];
  requestMetrics: RequestMetric[];
  aiHealth: AIHealthData | null;
  aiInteractions: AIInteraction[];
  aiActivities: AIActivity[];
  aiProvider: string;
  aiModel: string;
  performanceInsights: PerformanceInsight[];
  securityInsights: SecurityInsight[];
  usageInsights: UsageInsight[];
  dataFields: CrudField[];
  loading: boolean;
}

// Create a styled Box component for content padding
const StyledContentBox = styled('div')({
  padding: 24
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
    metrics,
    health,
    locations,
    errorDistribution,
    latestLogs,
    requestMetrics,
    aiProvider,
    aiModel,
    performanceInsights,
    securityInsights,
    usageInsights,
    dataFields,
    loading
  } = props;

  const { isConnected } = useSocket();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Local state for real-time updates
  const [healthState, setHealthState] = useState<SystemHealth | null>(health);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>(latestLogs || []);
  const [requestMetricsState, setRequestMetricsState] = useState<RequestMetric[]>(requestMetrics || []);
  const [locationsState, setLocationsState] = useState<RequestLocation[]>(locations || []);
  const [metricsState, setMetricsState] = useState<SystemMetrics | null>(metrics);
  const [aiRequestMetrics, setAiRequestMetrics] = useState<AIRequestMetric[]>([]);
  const [performanceInsightsState, setPerformanceInsightsState] = useState<PerformanceInsight | null>(
    Array.isArray(performanceInsights) && performanceInsights.length > 0 ? performanceInsights[0] : null
  );
  const [securityInsightsState, setSecurityInsightsState] = useState<SecurityInsight | null>(
    Array.isArray(securityInsights) && securityInsights.length > 0 ? securityInsights[0] : null
  );
  const [usageInsightsState, setUsageInsightsState] = useState<UsageInsight | null>(
    Array.isArray(usageInsights) && usageInsights.length > 0 ? usageInsights[0] : null
  );
  const [errorDistributionState, setErrorDistributionState] = useState<ErrorItem[] | null>(errorDistribution || null);

  // Update local state when props change
  useEffect(() => {
    setHealthState(health);
    setRecentLogs(latestLogs || []);
    setRequestMetricsState(requestMetrics || []);
    setLocationsState(locations || []);
    setMetricsState(metrics);
    setAiRequestMetrics([]);
    setPerformanceInsightsState(
      Array.isArray(performanceInsights) && performanceInsights.length > 0 ? performanceInsights[0] : null
    );
    setSecurityInsightsState(
      Array.isArray(securityInsights) && securityInsights.length > 0 ? securityInsights[0] : null
    );
    setUsageInsightsState(
      Array.isArray(usageInsights) && usageInsights.length > 0 ? usageInsights[0] : null
    );
    setErrorDistributionState(errorDistribution || null);
    setLastUpdate(new Date());
  }, [
    health,
    latestLogs,
    requestMetrics,
    locations,
    metrics,
    performanceInsights,
    securityInsights,
    usageInsights,
    errorDistribution
  ]);

  // Add a refresh handler
  const onRefresh = () => {
    console.log('Dashboard refresh requested');
    setLastUpdate(new Date());
    // Here you would typically trigger data refetching
  };

  // Add status to locations for MapPanel
  const enhancedLocations = React.useMemo(() => {
    return locationsState.map(location => ({
      ...location,
      status: 'success' as 'success' | 'warning' | 'error'
    }));
  }, [locationsState]);

  // Update the logs format
  const formattedLogs = React.useMemo(() => {
    return mapLogsToComponentFormat(recentLogs);
  }, [recentLogs]);

  return (
    <Container maxWidth="xl">
      <div style={{ width: '100%', marginTop: 16 }}>
        <DashboardHeader 
          title="System Dashboard"
          isConnected={isConnected}
          loading={loading}
          lastUpdate={lastUpdate}
          onRefresh={onRefresh}
        />
        
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* System Overview Section */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)', pb: 1 }}>
              System Overview
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <SystemHealthPanel health={healthState} loading={loading} />
              </Grid>
              <Grid item xs={12}>
                <FixedErrorAnalysis 
                  title="Error Distribution" 
                  data={errorDistributionState as unknown as FixedErrorItem[] | null}
                  icon={<BugReport color="error" />} 
                />
              </Grid>
              <Grid item xs={12}>
                <LogsPanel 
                  logs={formattedLogs} 
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} md={4}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <MetricsCardPanel 
                  performanceInsights={performanceInsightsState}
                  securityInsights={securityInsightsState}
                  usageInsights={usageInsightsState}
                />
              </Grid>
              <Grid item xs={12}>
                <RequestMetricsPanel 
                  requestMetrics={requestMetricsState}
                  loading={loading}
                  chartType={'line'}
                  onChartTypeChange={() => {}}
                />
              </Grid>
              <Grid item xs={12}>
                <MapPanel locations={enhancedLocations} />
              </Grid>
            </Grid>
          </Grid>

          {/* AI Insights Section */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mt: 4, mb: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)', pb: 1 }}>
              AI Insights
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={12}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <AIHealthPanel 
                  aiScore={metricsState?.cpuUsage || 0}
                  aiStatus={metricsState?.cpuUsage ? (metricsState.cpuUsage > 80 ? 'critical' : metricsState.cpuUsage > 60 ? 'warning' : 'healthy') : 'healthy'}
                  aiAnalysis="AI system is analyzing metrics and providing insights in real-time."
                />
              </Grid>
              <Grid item xs={12}>
                <AIGlobePanel 
                  globeData={locationsState.map(loc => ({
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    intensity: loc.count,
                    city: loc.city,
                    country: loc.country
                  }))}
                />
              </Grid>
              <Grid item xs={12}>
                <AIActivityPanel 
                  activityData={aiRequestMetrics.map(metric => ({
                    timestamp: metric.timestamp,
                    path: `/api/ai/${metric.type}`,
                    method: 'POST',
                    statusCode: metric.status === 'success' ? 200 : 500,
                    duration: metric.duration,
                    ip: '127.0.0.1',
                    location: {
                      city: 'Unknown',
                      country: 'Unknown',
                      latitude: 0,
                      longitude: 0
                    }
                  }))}
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} md={4}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <AIMetricsPanel 
                  metrics={metricsState} 
                  aiProvider={aiProvider} 
                  aiModel={aiModel} 
                />
              </Grid>
              <Grid item xs={12}>
                <PerformanceInsightsPanel 
                  performanceInsights={performanceInsightsState} 
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Performance & Security Section */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mt: 4, mb: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)', pb: 1 }}>
              Performance & Security
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <DataManagementPanel 
              items={[]} 
              fields={dataFields}
              onAdd={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <SecurityInsightsPanel 
                  securityInsights={securityInsightsState} 
                />
              </Grid>
              <Grid item xs={12}>
                <UsageInsightsPanel 
                  usageInsights={usageInsightsState} 
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </div>
    </Container>
  );
}

export default UnifiedDashboard;