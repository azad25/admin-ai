import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiKey } from './ApiKey';
import { Widget } from './Widget';
import { CrudPage } from './CrudPage';
import { AISettings } from './AISettings';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  name!: string;

  @Column()
  password!: string;

  @Column({
    type: 'enum',
    enum: ['ADMIN', 'USER'],
    default: 'USER',
    enumName: 'user_role_enum'
  })
  role!: 'ADMIN' | 'USER';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => ApiKey, (apiKey) => apiKey.user)
  apiKeys!: ApiKey[];

  @OneToMany(() => Widget, (widget) => widget.user)
  widgets!: Widget[];

  @OneToMany(() => CrudPage, (crudPage) => crudPage.user)
  crudPages!: CrudPage[];

  @OneToMany(() => AISettings, (aiSettings) => aiSettings.user)
  aiSettings!: AISettings[];
} 