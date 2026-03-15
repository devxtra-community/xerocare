import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Purchase } from './purchaseEntity';
import { Branch } from './branchEntity';

@Entity('purchase_payments')
export class PurchasePayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'purchase_id', type: 'uuid' })
  purchaseId!: string;

  @ManyToOne(() => Purchase)
  @JoinColumn({ name: 'purchase_id' })
  purchase!: Purchase;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ name: 'payment_date', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  paymentDate!: Date;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 50 })
  paymentMethod!: string;

  @Column({ name: 'reference_number', type: 'varchar', length: 100, nullable: true })
  referenceNumber?: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
