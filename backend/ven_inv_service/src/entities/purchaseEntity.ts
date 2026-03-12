import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Lot } from './lotEntity';
import { Vendor } from './vendorEntity';
import { Branch } from './branchEntity';
import { PurchasePayment } from './purchasePaymentEntity';

@Entity('purchases')
export class Purchase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'lot_id', type: 'uuid', unique: true })
  lotId!: string;

  @OneToOne(() => Lot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lot_id' })
  lot!: Lot;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor!: Vendor;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch;

  @Column({ name: 'purchase_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  purchaseAmount!: number;

  @Column({ name: 'documentation_fee', type: 'decimal', precision: 12, scale: 2, default: 0 })
  documentationFee!: number;

  @Column({ name: 'labour_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  labourCost!: number;

  @Column({ name: 'handling_fee', type: 'decimal', precision: 12, scale: 2, default: 0 })
  handlingFee!: number;

  @Column({ name: 'transportation_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  transportationCost!: number;

  @Column({ name: 'shipping_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  shippingCost!: number;

  @Column({ name: 'groundfield_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  groundfieldCost!: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => PurchasePayment, (payment) => payment.purchase)
  payments!: PurchasePayment[];
}
