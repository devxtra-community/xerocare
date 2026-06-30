import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('depreciation_model_rules')
export class DepreciationModelRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  brandId!: string;

  @Column({ unique: true })
  modelId!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  annualDepreciationPct!: number;

  @Column({ default: 60 })
  usefulLifeMonths!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10 })
  salvageValuePct!: number;

  @Column({ default: 'STRAIGHT_LINE' })
  method!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column()
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
