import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { TargetType } from './enums/targetType';
import { TargetStatus } from './enums/targetStatus';

export interface TargetTier {
  fromPercent: number;
  toPercent: number | null;
  incentivePercent: number;
}

@Entity('employee_targets')
export class EmployeeTarget {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  employeeId!: string;

  @Column()
  branchId!: string;

  @Column()
  assignedBy!: string;

  @Column({ type: 'varchar', length: 7 })
  targetMonth!: string; // 'YYYY-MM'

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  targetAmount!: number;

  @Column({ type: 'varchar' })
  targetType!: TargetType;

  @Column({ type: 'varchar', length: 3 })
  currencyCode!: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  tiers!: TargetTier[];

  @Column({ type: 'varchar', default: TargetStatus.ACTIVE })
  status!: TargetStatus;

  @CreateDateColumn()
  createdAt!: Date;
}
