import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from './employeeEntities';
import { Admin } from './adminEntities';

@Entity('auth')
export class Auth {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee | null;

  @ManyToOne(() => Admin, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_id' })
  admin!: Admin | null;

  @Column()
  refresh_token!: string;

  @Column({ nullable: true })
  ip_address!: string;

  @Column({ nullable: true })
  user_agent!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
