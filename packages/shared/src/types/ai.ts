import { z } from 'zod';

export type LLMProvider = 'openai' | 'gemini' | 'anthropic';

export interface AIProviderConfig {
  provider: LLMProvider;
  apiKey?: string;
  selectedModel?: string;
  isActive?: boolean;
  isVerified?: boolean;
  availableModels?: string[];
  lastVerified?: Date;
  settings?: Record<string, any>;
}

export interface AIMessageMetadata {
  type?: 'notification' | 'chat' | 'command' | 'analysis' | 'suggestion';
  status?: 'error' | 'success' | 'info' | 'warning';
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  command?: string;
  source?: {
    page?: string;
    controller?: string;
    action?: string;
    details?: Record<string, any>;
  };
  actions?: Array<{
    label: string;
    action: string;
    data?: any;
  }>;
  timestamp: string;
  read?: boolean;
  provider?: LLMProvider;
  model?: string;
  style?: {
    icon?: string;
    color?: string;
    background?: string;
    animation?: string;
  };
}

export interface AIMessage {
  id: string;
  content: string;
  role: 'system' | 'user' | 'assistant';
  metadata: AIMessageMetadata;
  timestamp: string;
}

export const AIMessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  metadata: z.object({
    type: z.enum(['notification', 'chat', 'command', 'analysis', 'suggestion']).optional(),
    status: z.enum(['error', 'success', 'info', 'warning']).optional(),
    category: z.string().optional(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    command: z.string().optional(),
    source: z.object({
      page: z.string().optional(),
      controller: z.string().optional(),
      action: z.string().optional(),
      details: z.record(z.any()).optional(),
    }).optional(),
    actions: z.array(z.object({
      label: z.string(),
      action: z.string(),
      data: z.any().optional(),
    })).optional(),
    timestamp: z.string(),
    read: z.boolean().optional(),
    provider: z.string().optional(),
    model: z.string().optional(),
    style: z.object({
      icon: z.string().optional(),
      color: z.string().optional(),
      background: z.string().optional(),
      animation: z.string().optional(),
    }).optional(),
  }),
  timestamp: z.string(),
});

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

export interface AISystemStatus {
  activeConnections: number;
  databaseSize: string;
  tableCounts: Record<string, number>;
  lastUpdated: Date;
}

export interface AISettings {
  providers: AIProviderConfig[];
  activeProvider?: LLMProvider;
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
  timestamp: string;
}

export interface AIAnalysisResult {
  summary: string;
  recommendations: string[];
  confidence: number;
  details: Record<string, any>;
} 