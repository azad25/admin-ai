import api from './api';
import { SystemHealth, SystemMetrics, RequestMetric, RequestLocation } from '../types/metrics';

export class MetricsService {
  private static instance: MetricsService;

  private constructor() {}

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const response = await api.get('/metrics/health');
    return response.data;
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const response = await api.get('/metrics/system');
    return response.data;
  }

  async getRequestMetrics(): Promise<RequestMetric[]> {
    const response = await api.get('/metrics/requests');
    return response.data;
  }

  async getLocationHeatmap(): Promise<RequestLocation[]> {
    const response = await api.get('/metrics/locations');
    return response.data;
  }

  async getPerformanceInsights(): Promise<{
    cpu: {
      current: number;
      trend: 'up' | 'down' | 'stable';
      recommendation?: string;
    };
    memory: {
      current: number;
      trend: 'up' | 'down' | 'stable';
      recommendation?: string;
    };
    database: {
      connections: number;
      trend: 'up' | 'down' | 'stable';
      recommendation?: string;
    };
  }> {
    const response = await api.get('/metrics/insights/performance');
    return response.data;
  }

  async getSecurityInsights(): Promise<{
    failedLogins: number;
    suspiciousActivities: number;
    vulnerabilities: Array<{
      type: string;
      severity: 'high' | 'medium' | 'low';
      description: string;
    }>;
    recommendations: string[];
  }> {
    const response = await api.get('/metrics/insights/security');
    return response.data;
  }

  async getUsageInsights(): Promise<{
    daily: {
      requests: number;
      uniqueUsers: number;
      peakHour: number;
    };
    weekly: {
      trend: 'up' | 'down' | 'stable';
      busyDays: string[];
      averageLoad: number;
    };
    monthly: {
      growth: number;
      forecast: number;
      recommendations: string[];
    };
  }> {
    const response = await api.get('/metrics/insights/usage');
    return response.data;
  }
}

export const metricsService = MetricsService.getInstance(); 