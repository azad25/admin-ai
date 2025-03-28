import { z } from 'zod';
import { LLMProvider } from './common.js';
import { SystemHealth, SystemMetrics } from './metrics';

export type { LLMProvider };

export interface AIProviderConfig {
  provider: LLMProvider;
  apiKey?: string;
  selectedModel?: string;
  isActive?: boolean;
  isVerified?: boolean;
  availableModels?: string[];
  lastVerified?: Date;
  settings?: Record<string, any>;
  userId?: string;
  name: string;
  type: 'openai' | 'anthropic' | 'custom';
  model: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
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
  ready: boolean;
  connected: boolean;
  initialized: boolean;
  hasProviders: boolean;
  activeProviders: Array<{
    provider: string;
    model: string;
  }>;
}

export interface AISettings {
  providers: AIProviderConfig[];
  activeProvider?: LLMProvider;
  enableRandomMessages: boolean;
  messageInterval: number;
  systemCommands: string[];
}

export interface AIAnalysis {
  performance: {
    cpuAnalysis: {
      status: string;
      trend: 'up' | 'down' | 'stable';
      recommendations: string[];
    };
    memoryAnalysis: {
      status: string;
      trend: 'up' | 'down' | 'stable';
      recommendations: string[];
    };
    recommendations: string[];
  };
  trends: {
    cpu: number[];
    memory: number[];
    requests: number[];
    errors: number[];
  };
}

export interface AIAnalysisResult {
  insights: string[];
  recommendations: string[];
  actions: AIAction[];
  confidence: number;
  timestamp: string;
}

export type ResourceStatus = 'critical' | 'warning' | 'normal';

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage?: number;
  errorCount: number;
  totalRequests: number;
  activeUsers: number;
  cpu?: {
    usage: number;
    status: ResourceStatus;
    trend: 'up' | 'down' | 'stable';
    recommendations: string[];
  };
  memory?: {
    usage: number;
    status: ResourceStatus;
    trend: 'up' | 'down' | 'stable';
    recommendations: string[];
  };
  disk?: {
    usage: number;
    status: ResourceStatus;
  };
}

export interface RequestMetric {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  location: {
    country: string;
    city: string;
  };
  duration: number;
}

export interface AISuggestion {
  type: 'performance' | 'security' | 'reliability' | 'maintenance';
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  implementation: string;
  timestamp: string;
}

export interface AIAction {
  type: 'optimize' | 'investigate' | 'scale' | 'alert';
  target: string;
  parameters: Record<string, any>;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'failed';
  result?: any;
  error?: string;
  timestamp: string;
}

export interface AIAnalysisContext {
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    metrics: Record<string, number>;
  };
  metrics: {
    performance: {
      responseTime: number;
      throughput: number;
      errorRate: number;
    };
    resources: {
      cpuUsage: number;
      memoryUsage: number;
      diskUsage: number;
    };
    security: {
      threatCount: number;
      vulnerabilityCount: number;
    };
  };
  recentActions: AIAction[];
  suggestions: AISuggestion[];
  systemState: Record<string, any>;
}

export interface AIOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export interface AIFileAccess {
  path: string;
  operation: 'read' | 'write' | 'delete';
  content?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface AISystemDiagnostic {
  category: 'performance' | 'security' | 'reliability' | 'maintenance';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  recommendations: string[];
  metrics: Record<string, number>;
  timestamp: string;
}