import type { AIMessage, AIAnalysis } from './ai.js';
import type { SystemHealth, SystemMetrics } from './metrics.js';
import type { LogEntry } from './logs.js';
import type { ErrorLog } from './error.js';

export interface WebSocketEvents {
  // Connection events
  'connected': void;
  'disconnected': void;

  // AI events
  'ai:message': AIMessage;
  'ai:start': void;
  'ai:end': void;
  'ai:error': { message: string };
  'ai:status': { 
    ready: boolean;
    initialized?: boolean;
    connected?: boolean;
    hasProviders?: boolean;
    activeProviders?: string[];
    timestamp?: string;
  };
  'ai:ready': void;

  // Metrics events
  'metrics:request': void;
  'metrics:update': {
    health: SystemHealth;
    metrics: SystemMetrics;
    timestamp: string;
  };
  'metrics:analysis': AIAnalysis;
  'metrics:status': {
    health: SystemHealth;
    metrics: SystemMetrics;
    timestamp: string;
  };

  // Error events
  'error:new': ErrorLog;
  'error:analysis': {
    error: ErrorLog;
    analysis: AIAnalysis;
  };
  'error:log': {
    type: string;
    data: LogEntry;
  };

  // Activity events
  'activity:ai': {
    type: string;
    data: {
      userId: string;
      action: string;
      timestamp: string;
      details: Record<string, any>;
    };
  };
  'activity:log': {
    type: string;
    data: LogEntry;
  };

  // Admin events
  'admin:notification': {
    id: string;
    type: string;
    message: string;
    timestamp: string;
    metadata?: Record<string, any>;
  };

  // System events
  'system:status': {
    health: SystemHealth;
    metrics: SystemMetrics;
    timestamp: string;
  };
} 