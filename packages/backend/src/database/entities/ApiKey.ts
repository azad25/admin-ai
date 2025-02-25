import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';

@Entity('api_key')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  key!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.apiKeys)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastUsed?: Date;
} 