import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CrudPage } from './CrudPage';

@Entity()
export class CrudData {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  pageId!: string;

  @Column('jsonb')
  data!: Record<string, any>;

  @ManyToOne(() => CrudPage, page => page.data, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pageId' })
  page!: CrudPage;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
} 