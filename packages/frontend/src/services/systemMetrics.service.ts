import api from './api';

// Define the SystemHealth interface locally since the shared type might not be available
export interface SystemHealth {
  // New format
  timestamp?: string;
  score?: number;
  status?: string;
  services?: {
    [key: string]: {
      status: 'up' | 'down' | 'degraded';
      lastCheck: string;
      message?: string;
    };
  };
  resources?: {
    cpu?: {
      usage: number;
      status: 'critical' | 'warning' | 'normal';
    };
    memory?: {
      usage: number;
      status: 'critical' | 'warning' | 'normal';
    };
    disk?: {
      usage: number;
      status: 'critical' | 'warning' | 'normal';
    };
  };
  
  // Old format
  uptime?: number;
  cpu?: {
    usage: number;
    cores: number;
    model: string;
    speed: number;
  };
  memory?: {
    total: number;
    free: number;
    usage: number;
  };
  os?: {
    platform: string;
    release: string;
    type: string;
    arch: string;
    hostname: string;
  };
  network?: Record<string, Array<{
    address: string;
    netmask: string;
    family: string;
    mac: string;
    internal: boolean;
  }>>;
  database?: {
    status: string;
    active_connections: number;
    db_size: number;
    table_count: number;
  };
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, any>;
  location?: {
    country: string;
    city: string;
  };
}

export interface ErrorLogEntry extends LogEntry {
  error: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface AuthLogEntry extends LogEntry {
  user: {
    id: string;
    email: string;
  };
  action: string;
  success: boolean;
}

export interface RequestMetric {
  timestamp: string;
  requestCount: number;
  averageResponseTime: number;
  successCount: number;
  errorCount: number;
  locations: string[];
}

export interface RequestLocation {
  ip: string;
  latitude: number;
  longitude: number;
  count: number;
  lastSeen: string;
  city: string;
  country: string;
}

export class SystemMetricsService {
  private static instance: SystemMetricsService;

  private constructor() {}

  public static getInstance(): SystemMetricsService {
    if (!SystemMetricsService.instance) {
      SystemMetricsService.instance = new SystemMetricsService();
    }
    return SystemMetricsService.instance;
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const response = await api.get('/metrics/health');
    return response.data;
  }

  async getRecentLogs(): Promise<LogEntry[]> {
    const response = await api.get('/metrics/logs/recent');
    return response.data;
  }

  async getErrorLogs(): Promise<ErrorLogEntry[]> {
    const response = await api.get('/metrics/logs/errors');
    return response.data;
  }

  async getAuthLogs(): Promise<AuthLogEntry[]> {
    const response = await api.get('/metrics/logs/auth');
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
}

export const systemMetricsService = SystemMetricsService.getInstance(); 