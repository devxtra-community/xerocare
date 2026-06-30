import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('asset_depreciation_register')
export class AssetDepreciationRegister {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  productId!: string;

  @Column()
  brandId!: string;

  @Column()
  modelId!: string;

  @Column()
  branchId!: string;

  @Column({ type: 'date' })
  purchaseDate!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  purchasePrice!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  annualDepreciationPct!: number;

  @Column()
  usefulLifeMonths!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  salvageValuePct!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  salvageValue!: number;

  @Column({ default: 'STRAIGHT_LINE' })
  method!: string;

  @Column({ default: 'ACTIVE' })
  status!: string; // ACTIVE | FULLY_DEPRECIATED | DISPOSED | SUSPENDED

  @Column({ type: 'date', nullable: true })
  disposalDate?: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  disposalValue?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column()
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
