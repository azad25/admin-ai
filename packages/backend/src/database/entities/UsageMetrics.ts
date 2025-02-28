import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('usage_metrics')
export class UsageMetrics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn()
  timestamp!: Date;

  @Column('integer')
  totalRequests!: number;

  @Column('integer')
  uniqueUsers!: number;

  @Column('integer')
  peakHour!: number;

  @Column('float')
  averageResponseTime!: number;

  @Column('jsonb', { default: [] })
  busyDays!: string[];

  @Column('float')
  averageLoad!: number;

  @Column('float')
  growthRate!: number;

  @Column('integer')
  forecast!: number;

  @Column('jsonb', { default: [] })
  recommendations!: string[];

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;
} 