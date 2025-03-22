import { ErrorLog as SharedErrorLog } from '@admin-ai/shared/src/types/error';
import { SystemHealth as SharedSystemHealth, SystemMetrics as SharedSystemMetrics } from '@admin-ai/shared/src/types/metrics';
import { AIAnalysis as SharedAIAnalysis } from '@admin-ai/shared/src/types/ai';

export interface RequestMetric {
  path: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: string;
  userId?: string;
}

export interface RequestLocation {
  ip: string;
  latitude: number;
  longitude: number;
  count: number;
  lastSeen: string;
  city: string;
  country: string;
  uniqueIps: number;
}

export interface AIMessageMetadata {
  userId?: string;
  timestamp?: string;
  context?: Record<string, any>;
}

export interface ErrorLog extends SharedErrorLog {
  // Additional backend-specific fields can be added here
}

export interface SystemHealth {
  timestamp: string;
  score: number;
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
  averageResponseTime?: number;
  warningCount?: number;
  database?: {
    active_connections: number;
  };
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
  topPaths?: Array<{
    path: string;
    count: number;
    averageResponseTime: number;
  }>;
}

export interface AIAnalysis extends SharedAIAnalysis {
  // Additional backend-specific fields can be added here
} 