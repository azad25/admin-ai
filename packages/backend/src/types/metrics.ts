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

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  services: {
    [key: string]: {
      status: 'up' | 'down' | 'degraded';
      lastCheck: string;
      message?: string;
    };
  };
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
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

export interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
  context: {
    path?: string;
    method?: string;
    userId?: string;
    [key: string]: any;
  };
  status: 'new' | 'investigating' | 'resolved';
  resolution?: {
    analysis: string;
    solution?: string;
    resolvedAt?: string;
    resolvedBy?: string;
  };
}

export interface AIAnalysis {
  type: 'error' | 'metrics' | 'health';
  timestamp: string;
  insights: Array<{
    type: 'warning' | 'critical' | 'info';
    message: string;
    recommendation?: string;
    autoFix?: {
      command: string;
      description: string;
      risk: 'low' | 'medium' | 'high';
    };
  }>;
  trends?: {
    [key: string]: {
      current: number;
      previous: number;
      change: number;
      status: 'improving' | 'stable' | 'degrading';
    };
  };
}

export interface SystemMetrics {
  requests: {
    total: number;
    success: number;
    failed: number;
    avgResponseTime: number;
  };
  resources: {
    cpu: {
      usage: number;
      load: number[];
    };
    memory: {
      used: number;
      total: number;
      free: number;
    };
    disk: {
      used: number;
      total: number;
      free: number;
    };
  };
  services: {
    [key: string]: {
      status: 'up' | 'down';
      uptime: number;
      lastRestart?: string;
    };
  };
  ai: {
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    modelUsage: {
      [key: string]: {
        requests: number;
        tokens: number;
        cost: number;
      };
    };
  };
} 