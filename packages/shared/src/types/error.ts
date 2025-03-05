export interface ErrorLog {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  stack?: string;
  metadata: {
    userId?: string;
    source?: string;
    severity: 'low' | 'medium' | 'high';
    details?: Record<string, any>;
  };
} 