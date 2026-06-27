import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { EmployeeManager } from './employeeManagerEntity';

export enum BranchStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  address!: string;

  @Column()
  location!: string;

  @Column({ nullable: true, unique: true })
  manager_id?: string;

  @OneToOne(() => EmployeeManager, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager?: EmployeeManager;

  @Column({ type: 'date' })
  started_date!: Date;

  @Column({
    type: 'enum',
    enum: BranchStatus,
    default: BranchStatus.ACTIVE,
  })
  status!: BranchStatus;

  // --- Country & Currency ---
  @Column({ type: 'varchar', length: 2, nullable: true })
  country_code?: string;

  @Column({ type: 'varchar', length: 3, nullable: true })
  currency_code?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency_symbol?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  currency_name?: string;

  // --- Tax Configuration ---
  @Column({ type: 'boolean', default: false })
  has_tax!: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tax_name?: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  tax_percent?: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tax_registration_number?: string | null;

  // --- Address Details ---
  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postal_code?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
