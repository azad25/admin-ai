export interface BaseLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: {
    file?: string;
    function?: string;
    line?: number;
  };
  metadata?: Record<string, any>;
}

export interface ErrorLog extends BaseLog {
  level: 'error';
  stack?: string;
  code?: string;
  handled: boolean;
  resolution?: {
    status: 'pending' | 'in_progress' | 'resolved';
    suggestion?: string;
    aiAnalysis?: string;
  };
}

export interface RequestLog extends BaseLog {
  method: string;
  path: string;
  duration: number;
  statusCode: number;
  ip: string;
  userAgent: string;
  location?: {
    country: string;
    city: string;
    coordinates: [number, number];
  };
}

export interface AuditLog extends BaseLog {
  userId: string;
  action: string;
  resource: string;
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
} 