import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  targetAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  achievedAmount!: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  achievementPercent!: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  appliedTierPercent!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  incentiveAmount!: number;

  @Column({ type: 'int', default: 0 })
  dealCount!: number;

  @Column({ type: 'timestamp' })
  calculatedAt!: Date;

  @Column({ type: 'boolean', default: false })
  isFinalized!: boolean;
}
