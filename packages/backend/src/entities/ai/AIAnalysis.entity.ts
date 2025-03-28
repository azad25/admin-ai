import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { AIAnalysisResult } from '@admin-ai/shared/types/ai';

@Entity('ai_analysis')
export class AIAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('jsonb')
  insights: string[];

  @Column('jsonb')
  recommendations: string[];

  @Column('jsonb')
  actions: string[];

  @Column('float')
  confidence: number;

  @Column('jsonb')
  context: Record<string, any>;

  @Column('jsonb')
  metrics: Record<string, number>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  static fromAIAnalysisResult(result: AIAnalysisResult, context: Record<string, any>, metrics: Record<string, number>): AIAnalysis {
    const analysis = new AIAnalysis();
    analysis.insights = result.insights;
    analysis.recommendations = result.recommendations;
    analysis.actions = result.actions;
    analysis.confidence = result.confidence;
    analysis.context = context;
    analysis.metrics = metrics;
    return analysis;
  }

  toAIAnalysisResult(): AIAnalysisResult {
    return {
      insights: this.insights,
      recommendations: this.recommendations,
      actions: this.actions,
      confidence: this.confidence,
      timestamp: this.createdAt.toISOString()
    };
  }
} 