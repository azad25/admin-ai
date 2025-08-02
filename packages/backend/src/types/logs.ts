export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, any>;
}

export interface ErrorLogEntry extends LogEntry {
  level: 'error';
  stack?: string;
  code?: string;
  details?: Record<string, any>;
}

// Alias for backward compatibility
export type ErrorLog = ErrorLogEntry;

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: string;
  action: string;
  success: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, any>;
} 