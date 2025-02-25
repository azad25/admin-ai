import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { LLMProvider } from '@admin-ai/shared/src/types/ai';
import { User } from './User';

@Entity()
export class AISettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.aiSettings)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({
    type: 'enum',
    enum: ['openai', 'anthropic', 'gemini'],
  })
  provider!: LLMProvider;

  @Column({ type: 'text' })
  apiKey!: string;

  @Column({ default: false })
  isActive!: boolean;

  @Column({ default: false })
  isVerified!: boolean;

  @Column({ type: 'text', nullable: true })
  selectedModel!: string | null;

  @Column('text', { array: true, default: '{}' })
  availableModels!: string[];

  @Column({ type: 'jsonb', default: {} })
  settings!: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  lastVerified!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
} 