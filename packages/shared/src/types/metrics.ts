import type { ResourceStatus } from './ai.js';

export interface SystemHealth {
  timestamp: string;
  services: {
    [key: string]: {
      status: 'up' | 'down' | 'degraded';
      lastCheck: string;
      message?: string;
    };
  };
  resources: {
    cpu: {
      usage: number;
      status: 'critical' | 'warning' | 'normal';
    };
    memory: {
      usage: number;
      status: 'critical' | 'warning' | 'normal';
    };
    disk: {
      usage: number;
      status: 'critical' | 'warning' | 'normal';
    };
  };
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage?: number;
  errorCount: number;
  totalRequests: number;
  activeUsers: number;
  cpu?: {
    usage: number;
    status: 'critical' | 'warning' | 'normal';
    trend: 'up' | 'down' | 'stable';
    recommendations: string[];
  };
  memory?: {
    usage: number;
    status: 'critical' | 'warning' | 'normal';
    trend: 'up' | 'down' | 'stable';
    recommendations: string[];
  };
  disk?: {
    usage: number;
    status: 'critical' | 'warning' | 'normal';
  };
} 