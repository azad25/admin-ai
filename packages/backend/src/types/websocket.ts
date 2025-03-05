import { AIMessage } from './ai';
import { SystemHealth, SystemMetrics } from './metrics';
import { ErrorLog } from './logging';
import { AIAnalysis } from './analysis';

export interface WebSocketEvents {
  'ai:message': AIMessage;
  'ai:status': {
    status: 'idle' | 'processing' | 'error';
    message?: string;
  };
  'metrics:update': {
    health: SystemHealth;
    metrics: SystemMetrics;
    timestamp: string;
  };
  'metrics:analysis': AIAnalysis;
  'error:analysis': {
    error: ErrorLog;
    analysis: AIAnalysis;
  };
  'error:logged': ErrorLog;
  'user:notification': {
    type: 'info' | 'warning' | 'error';
    message: string;
    timestamp: string;
  };
} 