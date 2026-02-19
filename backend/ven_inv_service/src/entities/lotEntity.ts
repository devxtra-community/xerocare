import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Vendor } from './vendorEntity';
import { LotItem } from './lotItemEntity';
import { Warehouse } from './warehouseEntity';

export enum LotStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('lots')
export class Lot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'lot_number', type: 'varchar', length: 50, unique: true })
  @Index()
  lotNumber!: string;

  @Column({ name: 'vendor_id' })
  vendorId!: string;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor!: Vendor;

  @Column({ name: 'purchase_date', type: 'date' })
  purchaseDate!: Date;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ type: 'enum', enum: LotStatus, default: LotStatus.COMPLETED })
  status!: LotStatus;

  // --- Costs ---
  @Column({ name: 'transportation_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  transportationCost!: number;

  @Column({ name: 'documentation_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  documentationCost!: number;

  @Column({ name: 'shipping_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  shippingCost!: number;

  @Column({ name: 'ground_field_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  groundFieldCost!: number;

  @Column({ name: 'certification_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  certificationCost!: number;

  @Column({ name: 'labour_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  labourCost!: number;
  // -------------

  @Column({ name: 'branch_id', nullable: true })
  branch_id?: string;

  @Column({ name: 'warehouse_id', nullable: true })
  warehouse_id?: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse?: Warehouse;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => LotItem, (lotItem) => lotItem.lot, { cascade: true })
  items!: LotItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
