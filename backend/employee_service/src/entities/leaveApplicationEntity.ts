import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from './employeeEntities';
import { Branch } from './branchEntity';
import { LeaveType } from '../constants/leaveType';
import { LeaveStatus } from '../constants/leaveStatus';

@Entity('leave_applications')
@Index(['employee_id', 'start_date', 'end_date']) // For overlap checks
export class LeaveApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar' })
  employee_id!: string;

  @Index()
  @Column({ type: 'varchar' })
  branch_id!: string;

  @Column({ type: 'date' })
  start_date!: Date;

  @Column({ type: 'date' })
  end_date!: Date;

  @Column({ type: 'enum', enum: LeaveType })
  leave_type!: LeaveType;

  @Column({ type: 'text' })
  reason!: string;

  @Index()
  @Column({ type: 'enum', enum: LeaveStatus, default: LeaveStatus.PENDING })
  status!: LeaveStatus;

  @Column({ type: 'varchar', nullable: true })
  reviewed_by!: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  reviewed_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer!: Employee | null;
}
