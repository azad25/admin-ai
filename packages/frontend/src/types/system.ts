export interface SystemHealth {
  score: number;
  status: 'healthy' | 'warning' | 'error';
  issues: string[];
}

export interface ResourceUsage {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
}

export interface AIActivity {
  id: string;
  timestamp: string;
  type: 'analysis' | 'prediction' | 'action' | 'error';
  description: string;
  status: 'success' | 'error' | 'warning' | 'info';
  details?: Record<string, any>;
}

export interface SystemMetrics {
  health: SystemHealth;
  resourceUsage: ResourceUsage[];
  aiActivity: AIActivity[];
  lastUpdate: string;
} 