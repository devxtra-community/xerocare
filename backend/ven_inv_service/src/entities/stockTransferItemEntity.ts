import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { StockTransfer } from './stockTransferEntity';
import { SparePart } from './sparePartEntity';
import { Product } from './productEntity';
import { Model } from './modelEntity';

export enum TransferItemType {
  SPARE_PART = 'SPARE_PART',
  PRODUCT = 'PRODUCT',
}

export enum TransferItemStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('stock_transfer_items')
export class StockTransferItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'transfer_id', type: 'uuid' })
  transfer_id!: string;

  @ManyToOne(() => StockTransfer, (t) => t.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transfer_id' })
  transfer!: StockTransfer;

  @Column({
    name: 'item_type',
    type: 'enum',
    enum: TransferItemType,
  })
  item_type!: TransferItemType;

  @Column({ name: 'spare_part_id', type: 'uuid', nullable: true })
  spare_part_id?: string;

  @ManyToOne(() => SparePart, { nullable: true })
  @JoinColumn({ name: 'spare_part_id' })
  spare_part?: SparePart;

  // INTER product lines are requested by model; the giver assigns serials at approval.
  @Column({ name: 'model_id', type: 'uuid', nullable: true })
  model_id?: string;

  @ManyToOne(() => Model, { nullable: true })
  @JoinColumn({ name: 'model_id' })
  model?: Model;

  // INTRA product lines pick a specific machine from the source warehouse.
  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  product_id?: string;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @Column({ name: 'requested_qty', type: 'int', default: 1 })
  requested_qty!: number;

  // Set by the giving manager at approval (may be lower than requested; 0 = line rejected).
  @Column({ name: 'approved_qty', type: 'int', nullable: true })
  approved_qty?: number;

  @Column({
    name: 'item_status',
    type: 'enum',
    enum: TransferItemStatus,
    default: TransferItemStatus.PENDING,
  })
  item_status!: TransferItemStatus;

  // Serials the giving manager assigned to an INTER product line (one product per unit).
  @Column({ name: 'assigned_product_ids', type: 'simple-json', nullable: true })
  assigned_product_ids?: string[];

  // Warehouse the stock is drawn from at the source (auto-picked for INTER at approval).
  @Column({ name: 'source_warehouse_id', type: 'uuid', nullable: true })
  source_warehouse_id?: string;

  @Column({ name: 'dispatched_qty', type: 'int', nullable: true })
  dispatched_qty?: number;

  @Column({ name: 'received_qty', type: 'int', nullable: true })
  received_qty?: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  unit_cost!: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
