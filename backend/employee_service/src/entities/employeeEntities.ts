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
import { EmployeeRole } from '../constants/employeeRole';
import { EmployeeJob } from '../constants/employeeJob';
import { FinanceJob } from '../constants/financeJob';
import { Branch } from './branchEntity';

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}

@Entity('employee')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20, nullable: true })
  display_id!: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  first_name!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  last_name!: string | null;

  @Column({ type: 'varchar', length: 255 })
  password_hash!: string;

  @Column({ type: 'enum', enum: EmployeeRole, default: EmployeeRole.EMPLOYEE })
  role!: EmployeeRole;

  @Index()
  @Column({ type: 'enum', enum: EmployeeJob, nullable: true })
  employee_job!: EmployeeJob | null;

  @Index()
  @Column({ type: 'enum', enum: FinanceJob, nullable: true })
  finance_job!: FinanceJob | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  salary!: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  profile_image_url!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  id_proof_key!: string | null;

  @Column({
    type: 'enum',
    enum: EmployeeStatus,
    default: EmployeeStatus.ACTIVE,
  })
  status!: EmployeeStatus;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expire_date!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  branch_id!: string | null;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch | null;
}
