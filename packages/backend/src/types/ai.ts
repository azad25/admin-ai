export type LLMProvider = 'openai' | 'anthropic' | 'gemini';

export interface AIMessage {
  id: string;
  content: string;
  role: 'system' | 'user' | 'assistant';
  type?: 'message' | 'notification' | 'error';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AIProviderConfig {
  provider: LLMProvider;
  isActive: boolean;
  isVerified: boolean;
  selectedModel: string | null;
  availableModels: string[];
  settings: Record<string, any>;
  lastVerified: Date | null;
}

export interface AIAnalysisResult {
  summary: string;
  recommendations: string[];
  confidence: number;
  details: Record<string, any>;
} 