import { useState, useEffect } from 'react';
import { useSocket } from './useSocket';
import { SystemHealth, SystemMetrics } from '@admin-ai/shared/types/metrics';
import { LogEntry } from '@admin-ai/shared/types/logs';
import { DashboardData, ErrorLogEntry, AuthLogEntry, RequestMetric, RequestLocation, PerformanceInsight, SecurityInsight, UsageInsight } from '../types/dashboard';
import { getWebSocketService } from '../services/websocket.service';

export const useDashboardData = (): DashboardData => {
  const { isConnected } = useSocket();
  const socket = getWebSocketService();
  const [data, setData] = useState<DashboardData>({
    health: null,
    metrics: null,
    recentLogs: [],
    errorLogs: [],
    authLogs: [],
    requestMetrics: [],
    locations: [],
    performanceInsights: [],
    securityInsights: [],
    usageInsights: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!isConnected || !socket) return;

    // Set up event listeners for real-time updates
    const handleMetricsUpdate = (update: { health: SystemHealth; metrics: SystemMetrics; timestamp: string }) => {
      setData(prev => ({
        ...prev,
        health: update.health,
        metrics: update.metrics,
        loading: false
      }));
    };

    const handleLogsUpdate = (logs: LogEntry[]) => {
      setData(prev => ({
        ...prev,
        recentLogs: logs,
        loading: false
      }));
    };

    const handleErrorLogsUpdate = (logs: ErrorLogEntry[]) => {
      setData(prev => ({
        ...prev,
        errorLogs: logs,
        loading: false
      }));
    };

    const handleAuthLogsUpdate = (logs: AuthLogEntry[]) => {
      setData(prev => ({
        ...prev,
        authLogs: logs,
        loading: false
      }));
    };

    const handleRequestMetricsUpdate = (metrics: RequestMetric[]) => {
      setData(prev => ({
        ...prev,
        requestMetrics: metrics,
        loading: false
      }));
    };

    const handleLocationsUpdate = (locations: RequestLocation[]) => {
      setData(prev => ({
        ...prev,
        locations: locations,
        loading: false
      }));
    };

    const handlePerformanceInsightsUpdate = (insights: PerformanceInsight[]) => {
      setData(prev => ({
        ...prev,
        performanceInsights: insights,
        loading: false
      }));
    };

    const handleSecurityInsightsUpdate = (insights: SecurityInsight[]) => {
      setData(prev => ({
        ...prev,
        securityInsights: insights,
        loading: false
      }));
    };

    const handleUsageInsightsUpdate = (insights: UsageInsight[]) => {
      setData(prev => ({
        ...prev,
        usageInsights: insights,
        loading: false
      }));
    };

    // Subscribe to WebSocket events
    socket.on('metrics:update', handleMetricsUpdate);
    socket.on('logs:update', handleLogsUpdate);
    socket.on('error:logs:update', handleErrorLogsUpdate);
    socket.on('auth:logs:update', handleAuthLogsUpdate);
    socket.on('request:metrics:update', handleRequestMetricsUpdate);
    socket.on('locations:update', handleLocationsUpdate);
    socket.on('insights:performance:update', handlePerformanceInsightsUpdate);
    socket.on('insights:security:update', handleSecurityInsightsUpdate);
    socket.on('insights:usage:update', handleUsageInsightsUpdate);

    // Request initial data
    socket.emit('dashboard:request_data');

    // Cleanup
    return () => {
      socket.off('metrics:update', handleMetricsUpdate);
      socket.off('logs:update', handleLogsUpdate);
      socket.off('error:logs:update', handleErrorLogsUpdate);
      socket.off('auth:logs:update', handleAuthLogsUpdate);
      socket.off('request:metrics:update', handleRequestMetricsUpdate);
      socket.off('locations:update', handleLocationsUpdate);
      socket.off('insights:performance:update', handlePerformanceInsightsUpdate);
      socket.off('insights:security:update', handleSecurityInsightsUpdate);
      socket.off('insights:usage:update', handleUsageInsightsUpdate);
    };
  }, [isConnected, socket]);

  return data;
}; 