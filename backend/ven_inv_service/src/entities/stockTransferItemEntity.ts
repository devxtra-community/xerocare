import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { StockTransfer } from './stockTransferEntity';
import { SparePart } from './sparePartEntity';
import { Product } from './productEntity';
import { Warehouse } from './warehouseEntity';

export enum TransferItemType {
  SPARE_PART = 'SPARE_PART',
  PRODUCT = 'PRODUCT',
}

@Entity('stock_transfer_items')
export class StockTransferItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'transfer_id', type: 'varchar' })
  transfer_id!: string;

  @ManyToOne(() => StockTransfer, (t) => t.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transfer_id' })
  transfer!: StockTransfer;

  @Column({ name: 'item_type', type: 'varchar', length: 20 })
  item_type!: TransferItemType;

  @Column({ name: 'spare_part_id', type: 'varchar', nullable: true })
  spare_part_id!: string;

  @ManyToOne(() => SparePart, { nullable: true })
  @JoinColumn({ name: 'spare_part_id' })
  spare_part!: SparePart;

  @Column({ name: 'product_id', type: 'varchar', nullable: true })
  product_id!: string;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ name: 'requested_qty', type: 'int', default: 1 })
  requested_qty!: number;

  @Column({ name: 'fulfilled_qty', type: 'int', nullable: true })
  fulfilled_qty!: number;

  @Column({ name: 'received_qty', type: 'int', nullable: true })
  received_qty!: number;

  @Column({ name: 'source_warehouse_id', type: 'varchar', nullable: true })
  source_warehouse_id!: string;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'source_warehouse_id' })
  source_warehouse!: Warehouse;

  @Column({ name: 'destination_warehouse_id', type: 'varchar', nullable: true })
  destination_warehouse_id!: string;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'destination_warehouse_id' })
  destination_warehouse!: Warehouse;

  @Column({ name: 'item_name', type: 'varchar', nullable: true })
  item_name!: string;
}
