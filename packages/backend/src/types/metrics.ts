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
  status: 'success' | 'warning' | 'error';
  category: string;
  source: {
    page: string;
    controller: string;
    action: string;
    details: Record<string, any>;
  };
  timestamp: string;
}

export interface ErrorLog extends SharedErrorLog {
  // Additional backend-specific fields can be added here
}

export interface SystemHealth extends SharedSystemHealth {
  // Additional backend-specific fields can be added here
  status: 'healthy' | 'degraded' | 'critical';
}

export interface SystemMetrics extends SharedSystemMetrics {
  // Additional backend-specific fields can be added here
}

export interface AIAnalysis extends SharedAIAnalysis {
  // Additional backend-specific fields can be added here
} 