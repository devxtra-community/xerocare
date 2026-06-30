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

export enum TransferItemType {
  SPARE_PART = 'SPARE_PART',
  PRODUCT = 'PRODUCT',
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

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  product_id?: string;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @Column({ name: 'requested_qty', type: 'int', default: 1 })
  requested_qty!: number;

  @Column({ name: 'dispatched_qty', type: 'int', nullable: true })
  dispatched_qty?: number;

  @Column({ name: 'received_qty', type: 'int', nullable: true })
  received_qty?: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  unit_cost!: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
