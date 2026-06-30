import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('depreciation_brand_rules')
export class DepreciationBrandRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  brandId!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  annualDepreciationPct!: number;

  @Column({ default: 60 })
  usefulLifeMonths!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10 })
  salvageValuePct!: number;

  @Column({ default: 'STRAIGHT_LINE' })
  method!: string; // STRAIGHT_LINE | DECLINING_BALANCE

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column()
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
