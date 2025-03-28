import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { AISuggestion as AISuggestionType } from '@admin-ai/shared/types/ai';

@Entity('ai_suggestions')
export class AISuggestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: ['optimization', 'security', 'performance', 'maintenance']
  })
  type!: 'optimization' | 'security' | 'performance' | 'maintenance';

  @Column({
    type: 'enum',
    enum: ['high', 'medium', 'low']
  })
  priority!: 'high' | 'medium' | 'low';

  @Column('text')
  description!: string;

  @Column('text')
  impact!: string;

  @Column('text')
  implementation!: string;

  @Column('jsonb')
  metadata: Record<string, any> = {};

  @Column('boolean', { default: false })
  implemented: boolean = false;

  @Column('timestamp', { nullable: true })
  implementedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  static fromAISuggestion(suggestion: AISuggestionType): AISuggestion {
    const entity = new AISuggestion();
    entity.type = suggestion.type;
    entity.priority = suggestion.priority;
    entity.description = suggestion.description;
    entity.impact = suggestion.impact;
    entity.implementation = suggestion.implementation;
    entity.createdAt = new Date(suggestion.timestamp);
    return entity;
  }

  toAISuggestion(): AISuggestionType {
    return {
      type: this.type,
      priority: this.priority,
      description: this.description,
      impact: this.impact,
      implementation: this.implementation,
      timestamp: this.createdAt.toISOString()
    };
  }
} 