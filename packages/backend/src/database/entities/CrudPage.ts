import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from './User';
import { CreateCrudPageData } from '../../schemas/crudPage.schema';
import { CrudData } from './CrudData';

type Field = CreateCrudPageData['fields'][0];

@Entity('crud_page')
export class CrudPage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  endpoint!: string;

  @Column({ nullable: true })
  description?: string;

  @Column('jsonb')
  schema!: Record<string, any>;

  @Column('jsonb', { default: {} })
  config!: Record<string, any>;

  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.crudPages)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @OneToMany(() => CrudData, data => data.page)
  data!: CrudData[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  fields?: Field[];
} 