export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'azure' | 'custom';

export interface AIProviderConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

export interface AIMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  metadata: {
    type?: 'chat' | 'notification' | 'analysis' | 'command';
    status?: 'success' | 'error' | 'info' | 'warning';
    category?: string;
    source?: {
      page?: string;
      controller?: string;
      action?: string;
      details?: Record<string, any>;
    };
    timestamp: number;
    read: boolean;
    style?: {
      icon?: string;
      color?: string;
      background?: string;
      animation?: string;
    };
    actions?: Array<{
      label: string;
      action: string;
      data?: any;
    }>;
  };
}

export interface AIActivity {
  id: string;
  type: 'analysis' | 'prediction' | 'action' | 'error';
  description: string;
  timestamp: number;
  details?: Record<string, any>;
  status: 'pending' | 'completed' | 'failed';
}

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

export interface AISystemStatus {
  activeConnections: number;
  databaseSize: string;
  tableCounts: Record<string, number>;
  lastUpdated: Date;
}

export interface AISettings {
  providers: AIProviderConfig[];
  enableRandomMessages: boolean;
  messageInterval: number;
  systemCommands: string[];
}

export interface AIAnalysis {
  type: 'performance' | 'security' | 'error' | 'usage';
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendations: string[];
  metadata: Record<string, any>;
  timestamp: number;
}

export interface AICommand {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
    default?: any;
  }>;
  examples: string[];
}