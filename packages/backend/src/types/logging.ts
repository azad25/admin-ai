import { LogEntry } from './logs';

export interface ErrorLogEntry extends LogEntry {
  level: 'error';
  stack?: string;
  code?: string;
  details?: Record<string, any>;
  type: string; // Required for backward compatibility
  context?: {
    userId?: string;
    path?: string;
    method?: string;
    statusCode?: number;
    [key: string]: any;
  };
  metadata: {
    userId?: string;
    source?: string;
    severity: 'high' | 'low' | 'medium';
    details?: Record<string, any>;
    [key: string]: any;
  };
}

// Adding alias for backward compatibility
export type ErrorLog = ErrorLogEntry; 