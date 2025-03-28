import { SystemHealth, SystemMetrics } from '@admin-ai/shared/types/metrics';
import { LogEntry } from '@admin-ai/shared/types/logs';

export interface ErrorLogEntry extends LogEntry {
  stack?: string;
  errorType: string;
  severity: 'error' | 'warning' | 'info';
}

export interface AuthLogEntry extends LogEntry {
  userId: string;
  action: 'login' | 'logout' | 'register' | 'password_reset';
  status: 'success' | 'failure';
  ip: string;
}

export interface RequestMetric {
  timestamp: string;
  path: string;
  method: string;
  statusCode: number;
  duration: number;
  ip: string;
}

export interface RequestLocation {
  ip: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  count: number;
  lastSeen: string;
}

export interface PerformanceInsight {
  cpu: {
    current: string;
    trend: 'increasing' | 'stable' | 'decreasing';
    recommendation: string;
  };
  memory: {
    current: string;
    trend: 'increasing' | 'stable' | 'decreasing';
    recommendation: string;
  };
  database: {
    connections: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    recommendation: string;
  };
  responseTime: {
    current: number;
    trend: 'degrading' | 'optimal';
    recommendation: string;
  };
  summary: string;
  score: number;
  aiProvider: string;
  timestamp: string;
}

export interface SecurityInsight {
  failedLogins: number;
  suspiciousActivities: number;
  suspiciousIPs: number;
  vulnerabilities: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  score: number;
  recommendations: string[];
  timestamp: string;
}

export interface UsageInsight {
  totalRequests: number;
  activeUsers: number;
  topPaths: Array<{
    path: string;
    count: number;
    averageResponseTime: number;
  }>;
  timestamp: string;
}

export interface DashboardData {
  health: SystemHealth | null;
  metrics: SystemMetrics | null;
  recentLogs: LogEntry[];
  errorLogs: ErrorLogEntry[];
  authLogs: AuthLogEntry[];
  requestMetrics: RequestMetric[];
  locations: RequestLocation[];
  performanceInsights: PerformanceInsight[];
  securityInsights: SecurityInsight[];
  usageInsights: UsageInsight[];
  loading: boolean;
  error: string | null;
} 