import { Repository, EntityRepository, FindOptionsWhere, FindOneOptions } from 'typeorm';
import { AIAnalysis } from '../entities/ai/AIAnalysis.entity';
import { AISuggestion } from '../entities/ai/AISuggestion.entity';
import { AIAction } from '../entities/ai/AIAction.entity';
import { AISystemDiagnostic } from '../entities/ai/AISystemDiagnostic.entity';
import { AIAnalysisResult, AISuggestion as AISuggestionType, AIAction as AIActionType, AISystemDiagnostic as AISystemDiagnosticType } from '@admin-ai/shared/types/ai';

@EntityRepository(AIAnalysis)
export class AIAnalysisRepository extends Repository<AIAnalysis> {
  async saveAnalysis(analysis: AIAnalysisResult): Promise<AIAnalysis> {
    const entity = AIAnalysis.fromAIAnalysisResult(analysis);
    return this.save(entity);
  }

  async getLatestAnalysis(): Promise<AIAnalysis | null> {
    return this.findOne({
      order: { createdAt: 'DESC' }
    } as FindOneOptions<AIAnalysis>);
  }

  async getAnalysesByDateRange(startDate: Date, endDate: Date): Promise<AIAnalysis[]> {
    return this.find({
      where: {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      } as FindOptionsWhere<AIAnalysis>,
      order: { createdAt: 'DESC' }
    });
  }
}

@EntityRepository(AISuggestion)
export class AISuggestionRepository extends Repository<AISuggestion> {
  async saveSuggestion(suggestion: AISuggestionType): Promise<AISuggestion> {
    const entity = AISuggestion.fromAISuggestion(suggestion);
    return this.save(entity);
  }

  async getActiveSuggestions(): Promise<AISuggestion[]> {
    return this.find({
      where: { implemented: false },
      order: { priority: 'DESC', createdAt: 'DESC' }
    });
  }

  async markSuggestionAsImplemented(id: string): Promise<AISuggestion | null> {
    const suggestion = await this.findOne({
      where: { id }
    } as FindOneOptions<AISuggestion>);
    if (suggestion) {
      suggestion.implemented = true;
      suggestion.implementedAt = new Date();
      return this.save(suggestion);
    }
    return null;
  }
}

@EntityRepository(AIAction)
export class AIActionRepository extends Repository<AIAction> {
  async saveAction(action: AIActionType): Promise<AIAction> {
    const entity = AIAction.fromAIAction(action);
    return this.save(entity);
  }

  async getPendingActions(): Promise<AIAction[]> {
    return this.find({
      where: { status: 'pending' },
      order: { priority: 'DESC', createdAt: 'ASC' }
    });
  }

  async updateActionStatus(id: string, status: 'completed' | 'failed', result?: any, error?: string): Promise<AIAction | null> {
    const action = await this.findOne({
      where: { id }
    } as FindOneOptions<AIAction>);
    if (action) {
      action.status = status;
      if (result) action.result = result;
      if (error) action.error = error;
      return this.save(action);
    }
    return null;
  }
}

@EntityRepository(AISystemDiagnostic)
export class AISystemDiagnosticRepository extends Repository<AISystemDiagnostic> {
  async saveDiagnostic(diagnostic: AISystemDiagnosticType): Promise<AISystemDiagnostic> {
    const entity = AISystemDiagnostic.fromAISystemDiagnostic(diagnostic);
    return this.save(entity);
  }

  async getActiveDiagnostics(): Promise<AISystemDiagnostic[]> {
    return this.find({
      where: { resolved: false },
      order: { severity: 'DESC', createdAt: 'DESC' }
    });
  }

  async resolveDiagnostic(id: string): Promise<AISystemDiagnostic | null> {
    const diagnostic = await this.findOne({
      where: { id }
    } as FindOneOptions<AISystemDiagnostic>);
    if (diagnostic) {
      diagnostic.resolve();
      return this.save(diagnostic);
    }
    return null;
  }

  async getDiagnosticsByCategory(category: 'performance' | 'security' | 'reliability' | 'maintenance'): Promise<AISystemDiagnostic[]> {
    return this.find({
      where: { category },
      order: { severity: 'DESC', createdAt: 'DESC' }
    });
  }
} 