import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { AISystemDiagnostic as AISystemDiagnosticType } from '@admin-ai/shared/types/ai';

@Entity('ai_system_diagnostics')
export class AISystemDiagnostic {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: ['performance', 'security', 'reliability', 'maintenance']
  })
  category!: 'performance' | 'security' | 'reliability' | 'maintenance';

  @Column({
    type: 'enum',
    enum: ['critical', 'high', 'medium', 'low']
  })
  severity!: 'critical' | 'high' | 'medium' | 'low';

  @Column('text')
  description!: string;

  @Column('text')
  impact!: string;

  @Column('jsonb')
  recommendations!: string[];

  @Column('jsonb')
  metrics!: Record<string, number>;

  @Column('jsonb')
  context: Record<string, any> = {};

  @Column('boolean', { default: false })
  resolved: boolean = false;

  @Column('timestamp', { nullable: true })
  resolvedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  static fromAISystemDiagnostic(diagnostic: AISystemDiagnosticType): AISystemDiagnostic {
    const entity = new AISystemDiagnostic();
    entity.category = diagnostic.category;
    entity.severity = diagnostic.severity;
    entity.description = diagnostic.description;
    entity.impact = diagnostic.impact;
    entity.recommendations = diagnostic.recommendations;
    entity.metrics = diagnostic.metrics;
    entity.createdAt = new Date(diagnostic.timestamp);
    return entity;
  }

  toAISystemDiagnostic(): AISystemDiagnosticType {
    return {
      category: this.category,
      severity: this.severity,
      description: this.description,
      impact: this.impact,
      recommendations: this.recommendations,
      metrics: this.metrics,
      timestamp: this.createdAt.toISOString()
    };
  }

  resolve(): void {
    this.resolved = true;
    this.resolvedAt = new Date();
    this.updatedAt = new Date();
  }
} 