export interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  context?: {
    userId?: string;
    path?: string;
    method?: string;
    statusCode?: number;
    [key: string]: any;
  };
  metadata?: {
    service?: string;
    component?: string;
    [key: string]: any;
  };
} 