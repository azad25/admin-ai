import type {
  LLMProvider,
  AIProviderConfig,
  AIMessage,
  AISystemStatus,
  AISettings,
  AIAnalysis,
  AICommand
} from '@admin-ai/shared';

// Frontend-specific interface for provider display
export interface AIProvider {
  id: LLMProvider;
  name: string;
  description: string;
  icon: string;
  defaultModel: string;
  apiKeyPlaceholder: string;
}

// Frontend-specific interface for activity tracking
export interface AIActivity {
  id: string;
  type: 'analysis' | 'prediction' | 'action' | 'error';
  description: string;
  timestamp: number;
  details?: Record<string, any>;
  status: 'pending' | 'completed' | 'failed';
}

// Frontend-specific interface for error handling
export interface AIError {
  id: string;
  message: string;
  stack?: string;
  timestamp: number;
  context?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'resolved';
  resolution?: string;
}

// Re-export shared types
export type {
  LLMProvider,
  AIProviderConfig,
  AIMessage,
  AISystemStatus,
  AISettings,
  AIAnalysis,
  AICommand
};