import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { AIAction as AIActionType, AIOperationResult } from '@admin-ai/shared/types/ai';

@Entity('ai_actions')
export class AIAction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  type!: string;

  @Column('text')
  target!: string;

  @Column('jsonb')
  parameters!: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ['high', 'medium', 'low']
  })
  priority!: 'high' | 'medium' | 'low';

  @Column({
    type: 'enum',
    enum: ['pending', 'in_progress', 'completed', 'failed']
  })
  status!: 'pending' | 'in_progress' | 'completed' | 'failed';

  @Column('jsonb', { nullable: true })
  result?: any;

  @Column('text', { nullable: true })
  error?: string;

  @Column('jsonb')
  metadata: Record<string, any> = {};

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  static fromAIAction(action: AIActionType): AIAction {
    const entity = new AIAction();
    entity.type = action.type;
    entity.target = action.target;
    entity.parameters = action.parameters;
    entity.priority = action.priority;
    entity.status = action.status;
    entity.result = action.result;
    entity.error = action.error;
    entity.createdAt = new Date(action.timestamp);
    return entity;
  }

  toAIAction(): AIActionType {
    return {
      type: this.type,
      target: this.target,
      parameters: this.parameters,
      priority: this.priority,
      status: this.status,
      result: this.result,
      error: this.error,
      timestamp: this.createdAt.toISOString()
    };
  }

  updateFromResult(result: AIOperationResult): void {
    this.status = result.success ? 'completed' : 'failed';
    this.result = result.data;
    this.error = result.error;
    this.updatedAt = new Date(result.timestamp);
  }
} 