import { Entity, PrimaryGeneratedColumn, Column, ValueTransformer } from 'typeorm';

// Postgres/pg returns `decimal` columns as strings (arbitrary precision, not safely a JS
// number by default) — without this, every decimal column here comes back as e.g.
// "7500.00" instead of 7500, which silently breaks numeric comparisons like
// achievedAmount >= targetAmount (string-vs-number) even though `+`/`*` happen to coerce.
const decimalTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string) => parseFloat(value),
};

@Entity('employee_target_achievements')
export class EmployeeTargetAchievement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  targetId!: string;

  @Column()
  employeeId!: string;

  @Column()
  branchId!: string;

  @Column({ type: 'varchar', length: 7 })
  targetMonth!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: decimalTransformer })
  targetAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  achievedAmount!: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0, transformer: decimalTransformer })
  achievementPercent!: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0, transformer: decimalTransformer })
  appliedTierPercent!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  incentiveAmount!: number;

  @Column({ type: 'int', default: 0 })
  dealCount!: number;

  @Column({ type: 'timestamp' })
  calculatedAt!: Date;

  @Column({ type: 'boolean', default: false })
  isFinalized!: boolean;
}
