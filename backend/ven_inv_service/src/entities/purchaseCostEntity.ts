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

@Entity('purchase_costs')
export class PurchaseCost {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'purchase_id', type: 'uuid' })
  purchaseId!: string;

  @ManyToOne(() => Purchase, (purchase) => purchase.costs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_id' })
  purchase!: Purchase;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ name: 'cost_type', type: 'varchar', length: 50 })
  costType!: string;

  /** How this cost line is spread across the lot's items when landed-cost
   * allocation runs. BY_VALUE = proportional to item total value, BY_QUANTITY =
   * proportional to unit count, EQUAL = split evenly across item rows. */
  @Column({ name: 'split_method', type: 'varchar', length: 20, default: 'BY_VALUE' })
  splitMethod!: 'BY_VALUE' | 'BY_QUANTITY' | 'EQUAL';

  @Column({ name: 'cost_date', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  costDate!: Date;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Receipt/invoice for this cost (e.g. the transporter's or customs broker's
  // bill), stored in R2. Optional — costs can be recorded without proof.
  @Column({ name: 'attachment_url', type: 'varchar', length: 500, nullable: true })
  attachmentUrl?: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
