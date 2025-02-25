import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class SystemMetrics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('float')
  cpuUsage!: number;

  @Column('float')
  memoryUsage!: number;

  @Column('integer')
  activeUsers!: number;

  @Column('integer')
  totalRequests!: number;

  @Column('float')
  averageResponseTime!: number;

  @Column('jsonb', { default: [] })
  topPaths!: { path: string; count: number }[];

  @Column('jsonb', { default: {} })
  locationStats!: Record<string, number>;

  @Column('integer')
  errorCount!: number;

  @Column('integer')
  warningCount!: number;

  @CreateDateColumn()
  timestamp!: Date;
} 