export interface AIAnalysis {
  performance: {
    cpuAnalysis: {
      status: string;
      trend: 'up' | 'down' | 'stable';
      recommendations: string[];
    };
    memoryAnalysis: {
      status: string;
      trend: 'up' | 'down' | 'stable';
      recommendations: string[];
    };
    recommendations: string[];
  };
  trends: {
    cpu: number[];
    memory: number[];
    requests: number[];
    errors: number[];
  };
  insights?: {
    patterns?: string[];
    anomalies?: string[];
    suggestions?: string[];
  };
} 