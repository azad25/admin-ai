import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { User } from './User';

@Entity('error_logs')
export class ErrorLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  message!: string;

  @Column('text', { nullable: true })
  stack?: string;

  @Column({ nullable: true })
  path?: string;

  @Column({ length: 10, nullable: true })
  method?: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column('text', { nullable: true })
  userAgent?: string;

  @Column({ length: 45, nullable: true })
  ip?: string;

  @Column('jsonb', { nullable: true })
  location?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  timestamp!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
} 