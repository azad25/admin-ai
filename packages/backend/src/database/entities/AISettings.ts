import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { LLMProvider, AIProviderConfig } from '@admin-ai/shared/src/types/ai';
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

  @Column({ type: 'jsonb', default: [] })
  providers!: AIProviderConfig[];

  @Column({ default: true })
  enableRandomMessages!: boolean;

  @Column({ default: 5000 })
  messageInterval!: number;

  @Column('text', { array: true, default: '{}' })
  systemCommands!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
} 