import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class RequestLocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  ip!: string;

  @Column()
  country!: string;

  @Column()
  city!: string;

  @Column('float')
  latitude!: number;

  @Column('float')
  longitude!: number;

  @Column()
  method!: string;

  @Column()
  path!: string;

  @Column('integer')
  statusCode!: number;

  @Column('float')
  duration!: number;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  requestId?: string;

  @CreateDateColumn()
  timestamp!: Date;
} 