import React, { useEffect, useState } from 'react';
import { Grid, Box, useTheme } from '@mui/material';
import {
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { SystemHealthGauge } from '../components/SystemHealthGauge';
import { AnimatedMetricsCard } from '../components/AnimatedMetricsCard';
import { ErrorAnalysis } from '../components/ErrorAnalysis';
import { AIGlobe } from '../components/3d/AIGlobe';
import { AIActivityTimeline } from '../components/AIActivityTimeline';
import type {
  SystemHealth,
  SystemMetrics,
  RequestLocation,
  RequestMetric,
  PerformanceInsight,
  SecurityInsight,
  UsageInsight,
} from '../types/metrics';
import { metricsService } from '../services/metrics.service';
import { wsService } from '../services/websocket.service';
import { useSocket } from '../contexts/SocketContext';

export const AIDashboard: React.FC = () => {
  const theme = useTheme();
  const { isConnected } = useSocket();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [requestMetrics, setRequestMetrics] = useState<RequestMetric[]>([]);
  const [locations, setLocations] = useState<RequestLocation[]>([]);
  const [performanceInsights, setPerformanceInsights] = useState<PerformanceInsight | null>(null);
  const [securityInsights, setSecurityInsights] = useState<SecurityInsight | null>(null);
  const [usageInsights, setUsageInsights] = useState<UsageInsight | null>(null);

  const fetchDashboardData = async () => {
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
      if (requestMetricsData.status === 'fulfilled') setRequestMetrics(Array.isArray(requestMetricsData.value) ? requestMetricsData.value : []);
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
      console.error('Error fetching dashboard data:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up WebSocket listeners for real-time updates
    if (isConnected) {
      wsService.on('metrics_update', (data: SystemMetrics) => {
        setMetrics(data);
      });

      wsService.on('health_update', (data: SystemHealth) => {
        setHealth(data);
      });

      return () => {
        wsService.removeAllListeners('metrics_update');
        wsService.removeAllListeners('health_update');
      };
    }
  }, [isConnected]);

  // Map system health status to gauge status
  const getGaugeStatus = (status: SystemHealth['status']): 'healthy' | 'warning' | 'critical' => {
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
  const globeData = locations.map(location => ({
    latitude: location.latitude,
    longitude: location.longitude,
    intensity: Math.min(1, location.count / 100), // Normalize intensity
    city: location.city,
    country: location.country,
  }));

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* System Health Gauge */}
        <Grid item xs={12} md={4}>
          <SystemHealthGauge
            value={health?.score ?? 0}
            status={health ? getGaugeStatus(health.status) : 'warning'}
          />
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <AnimatedMetricsCard
                title="CPU Usage"
                value={metrics?.cpuUsage ?? 0}
                unit="%"
                icon={<MemoryIcon />}
                color={theme.palette.primary.main}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <AnimatedMetricsCard
                title="Memory Usage"
                value={metrics?.memoryUsage ?? 0}
                unit="%"
                icon={<StorageIcon />}
                color={theme.palette.secondary.main}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <AnimatedMetricsCard
                title="Response Time"
                value={metrics?.averageResponseTime ?? 0}
                unit="ms"
                icon={<SpeedIcon />}
                color={theme.palette.warning.main}
              />
            </Grid>
          </Grid>
        </Grid>

        {/* Global Request Distribution */}
        <Grid item xs={12} md={6}>
          <AIGlobe data={globeData} />
        </Grid>

        {/* AI Activity Timeline */}
        <Grid item xs={12} md={6}>
          <AIActivityTimeline data={requestMetrics} />
        </Grid>

        {/* System Insights */}
        <Grid item xs={12} md={4}>
          <ErrorAnalysis
            title="Performance Insights"
            data={performanceInsights}
            icon={<SpeedIcon />}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <ErrorAnalysis
            title="Security Insights"
            data={securityInsights}
            icon={<SecurityIcon />}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <ErrorAnalysis
            title="Usage Insights"
            data={usageInsights}
            icon={<TimelineIcon />}
          />
        </Grid>
      </Grid>
    </Box>
  );
};