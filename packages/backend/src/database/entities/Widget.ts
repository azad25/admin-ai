import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';

@Entity('widget')
export class Widget {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({
    type: 'enum',
    enum: ['CHART', 'TABLE', 'METRIC', 'MAP', 'WEATHER', 'STATUS'],
    enumName: 'widget_type_enum'
  })
  type!: 'CHART' | 'TABLE' | 'METRIC' | 'MAP' | 'WEATHER' | 'STATUS';

  @Column({ type: 'jsonb' })
  config!: Record<string, unknown>;

  @Column({ type: 'jsonb' })
  position!: {
    x: number;
    y: number;
    w: number;
    h: number;
  };

  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.widgets)
  @JoinColumn({ name: 'userId' })
  user!: User;
} 