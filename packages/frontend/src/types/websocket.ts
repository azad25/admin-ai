/**
 * System health status
 */
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    message?: string;
  }>;
}

/**
 * System metrics
 */
export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
  };
  requests: {
    total: number;
    success: number;
    error: number;
    latency: number;
  };
}

/**
 * Error log entry
 */
export interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  context?: Record<string, any>;
}

/**
 * Log entry
 */
export interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  context?: Record<string, any>;
}

/**
 * AI Message
 */
export interface AIMessage {
  id: string;
  timestamp: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
}

/**
 * AI Analysis
 */
export interface AIAnalysis {
  id: string;
  timestamp: string;
  type: string;
  content: Record<string, any>;
  summary?: string;
}

/**
 * WebSocket events interface
 * This defines all the events that can be sent/received over WebSocket
 */
export interface WebSocketEvents {
  // Connection events
  'connected': void;
  'disconnected': string;
  'reconnect_failed': void;
  'error': Error;
  
  // Metrics events
  'metrics:update': { health: SystemHealth; metrics: SystemMetrics; timestamp: string };
  'metrics:status': { health: SystemHealth; metrics: SystemMetrics; timestamp: string };
  
  // Error events
  'error:new': ErrorLog;
  'error:analysis': { error: ErrorLog; analysis: AIAnalysis };
  'error:log': { type: string; data: LogEntry };
  
  // Activity events
  'activity:ai': { type: string; data: { userId: string; action: string; timestamp: string; details: Record<string, any>; } };
  'activity:log': { type: string; data: LogEntry };
  
  // System events
  'system:status': { health: SystemHealth; metrics: SystemMetrics; timestamp: string };
  
  // AI events
  'ai:message': AIMessage;
  'ai:analysis': AIAnalysis;
  'ai:error': Error;
  
  // Settings events
  'settings:update': Record<string, any>;
  
  // Custom events
  [key: string]: any;
} 