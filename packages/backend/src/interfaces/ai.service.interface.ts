import { SystemMetrics } from '@admin-ai/shared/types/metrics';
import { AIAnalysisResult, AISuggestion, AIAction, AISystemDiagnostic } from '@admin-ai/shared/types/ai';

export interface IAIService {
  analyzeSystemHealth(metrics: SystemMetrics): Promise<AIAnalysisResult>;
  generateSuggestions(metrics: SystemMetrics): Promise<AISuggestion[]>;
  executeAction(action: AIAction): Promise<AIAction>;
  generateDiagnostics(metrics: SystemMetrics): Promise<AISystemDiagnostic[]>;
  getActiveSuggestions(): Promise<AISuggestion[]>;
  getActiveDiagnostics(): Promise<AISystemDiagnostic[]>;
  markSuggestionAsImplemented(id: string): Promise<AISuggestion>;
  resolveDiagnostic(id: string): Promise<AISystemDiagnostic>;
  getDiagnosticsByCategory(category: 'performance' | 'security' | 'reliability' | 'maintenance'): Promise<AISystemDiagnostic[]>;
} 