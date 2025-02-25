export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  score: number;
  issues: string[];
  uptime: number;
  cpu: {
    usage: number;
    cores: number;
    model: string;
    speed: number;
  };
  memory: {
    total: number;
    free: number;
    usage: number;
  };
  database: {
    status: string;
    active_connections: number;
    size: number;
    tables: number;
  };
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeUsers: number;
  totalRequests: number;
  averageResponseTime: number;
  topPaths: Array<{
    path: string;
    count: number;
  }>;
  locationStats: Record<string, number>;
  errorCount: number;
  warningCount: number;
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