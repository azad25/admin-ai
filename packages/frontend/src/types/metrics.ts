export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  timestamp: string;
  uptime: number;
  score: number;
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
  };
  services: {
    database: ServiceHealth;
    cache: ServiceHealth;
    queue: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  lastCheck: string;
  message?: string;
}

export interface SystemMetrics {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  totalRequests: number;
  errorCount: number;
  warningCount: number;
  activeUsers: number;
  averageResponseTime: number;
  topPaths: string[];
  locationStats: Record<string, number>;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, any>;
}

export interface ErrorLogEntry extends LogEntry {
  error: Error | string;
  stack?: string;
}

export interface AuthLogEntry {
  timestamp: string;
  userId: string;
  action: 'login' | 'logout' | 'failed_login' | 'register';
  ip: string;
  userAgent: string;
  location?: {
    country: string;
    city: string;
    latitude: number;
    longitude: number;
  };
}

export interface RequestMetric {
  timestamp: string;
  path: string;
  method: string;
  statusCode: number;
  duration: number;
  ip: string;
  location?: {
    country: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  userAgent?: string;
  referer?: string;
  query?: string;
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

export interface MetricsUpdate {
  health?: SystemHealth;
  metrics?: SystemMetrics;
  logs?: LogEntry[];
  errorLogs?: ErrorLogEntry[];
  authLogs?: AuthLogEntry[];
  requestMetrics?: RequestMetric[];
  locations?: RequestLocation[];
  timestamp: string;
}

export interface PerformanceInsight {
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
}

export interface SecurityInsight {
  failedLogins: number;
  suspiciousActivities: number;
  vulnerabilities: Array<{
    type: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
  }>;
  recommendations: string[];
}

export interface UsageInsight {
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
}

export interface AIMetric {
  timestamp: string;
  requestCount: number;
  averageLatency: number;
  tokenUsage: number;
  modelDistribution: {
    [key: string]: number;
  };
  errorRate: number;
  costEstimate: number;
}

export interface SystemPerformance {
  timestamp: string;
  cpu: {
    usage: number;
    temperature: number;
    processes: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    cached: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    iops: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    errors: number;
  };
} 