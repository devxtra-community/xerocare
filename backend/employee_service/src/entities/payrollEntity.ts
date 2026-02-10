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
import { PayrollStatus } from '../constants/payrollStatus';

@Entity('payrolls')
@Index(['employee_id', 'month', 'year'], { unique: true })
export class Payroll {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar' })
  employee_id!: string;

  @Index()
  @Column({ type: 'varchar' })
  branch_id!: string;

  @Column({ type: 'integer' })
  month!: number; // 1-12

  @Column({ type: 'integer' })
  year!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  salary_amount!: number;

  @Column({ type: 'integer', default: 0 })
  work_days!: number;

  @Column({ type: 'integer', default: 0 })
  leave_days!: number;

  @Index()
  @Column({
    type: 'enum',
    enum: PayrollStatus,
    default: PayrollStatus.PENDING,
  })
  status!: PayrollStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  paid_date!: Date | null;

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
}
