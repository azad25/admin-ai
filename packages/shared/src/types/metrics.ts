import type { ResourceStatus } from './ai.js';

export interface SystemHealth {
  id: string;
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  resources: {
    cpu: {
      usage: number;
      status: 'normal' | 'warning' | 'critical';
    };
    memory: {
      usage: number;
      status: 'normal' | 'warning' | 'critical';
    };
    disk: {
      usage: number;
      status: 'normal' | 'warning' | 'critical';
    };
    network: {
      status: 'normal' | 'warning' | 'critical';
    };
  };
  services: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime: number;
  }>;
  timestamp: string;
}

export interface SystemMetrics {
  performance: {
    averageResponseTime: number;
    throughput: number;
    errorRate: number;
    dataPoints: number;
  };
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    dataPoints: number;
  };
  errors: {
    errorRate: number;
    warningCount: number;
    criticalCount: number;
    dataPoints: number;
  };
  security: {
    threatCount: number;
    vulnerabilityCount: number;
    dataPoints: number;
  };
  timestamp: string;
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  dataPoints: number;
}

export interface ResourceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  dataPoints: number;
}

export interface ErrorMetrics {
  errorRate: number;
  warningCount: number;
  criticalCount: number;
  dataPoints: number;
}

export interface SecurityMetrics {
  threatCount: number;
  vulnerabilityCount: number;
  dataPoints: number;
}

export interface MetricsSummary {
  performance: PerformanceMetrics;
  resources: ResourceMetrics;
  errors: ErrorMetrics;
  security: SecurityMetrics;
  timestamp: string;
}

export interface MetricsThreshold {
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
  };
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
  errors: {
    errorRate: number;
    warningCount: number;
    criticalCount: number;
  };
  security: {
    threatCount: number;
    vulnerabilityCount: number;
  };
}