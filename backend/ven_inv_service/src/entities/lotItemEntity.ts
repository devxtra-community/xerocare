import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
} from 'typeorm';
import { Lot } from './lotEntity';
import { Model } from './modelEntity';
import { SparePart } from './sparePartEntity';

export enum LotItemType {
  MODEL = 'MODEL',
  SPARE_PART = 'SPARE_PART',
}

@Entity('lot_items')
@Check(
  `("model_id" IS NOT NULL OR "custom_product_name" IS NOT NULL) AND "spare_part_id" IS NULL AND "custom_spare_part_name" IS NULL OR ("spare_part_id" IS NOT NULL OR "custom_spare_part_name" IS NOT NULL) AND "model_id" IS NULL AND "custom_product_name" IS NULL`,
)
export class LotItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'lot_id', type: 'uuid' })
  lotId!: string;

  @ManyToOne(() => Lot, (lot) => lot.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lot_id' })
  lot!: Lot;

  @Column({ name: 'item_type', type: 'enum', enum: LotItemType })
  itemType!: LotItemType;

  @Column({ name: 'model_id', type: 'uuid', nullable: true })
  modelId?: string;

  @ManyToOne(() => Model, { nullable: true })
  @JoinColumn({ name: 'model_id' })
  model?: Model;

  @Column({ name: 'spare_part_id', type: 'uuid', nullable: true })
  sparePartId?: string;

  @ManyToOne(() => SparePart, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'spare_part_id' })
  sparePart?: SparePart;

  /**
   * Expected quantity ordered from vendor (maps to legacy `quantity` column
   * so existing rows remain valid).
   */
  @Column({ name: 'quantity', type: 'int' })
  expectedQuantity!: number;

  /** Actual quantity confirmed received in good condition. */
  @Column({ name: 'received_quantity', type: 'int', default: 0 })
  receivedQuantity!: number;

  /** Quantity received but damaged / defective. */
  @Column({ name: 'damaged_quantity', type: 'int', default: 0 })
  damagedQuantity!: number;

  /**
   * Quantity that has been or will be returned to vendor.
   * Defaults to damaged_quantity when saving receiving data.
   */
  @Column({ name: 'returned_quantity', type: 'int', default: 0 })
  returnedQuantity!: number;

  /** How many units have already been consumed into inventory. */
  @Column({ name: 'used_quantity', type: 'int', default: 0 })
  usedQuantity!: number;

  @Column({ name: 'custom_product_name', type: 'varchar', nullable: true })
  customProductName?: string;

  @Column({ name: 'custom_spare_part_name', type: 'varchar', nullable: true })
  customSparePartName?: string;

  @Column({ name: 'mpn', type: 'varchar', nullable: true })
  mpn?: string;

  @Column({ name: 'compatible_models', type: 'text', nullable: true })
  compatibleModels?: string;

  @Column({ name: 'model_ids', type: 'simple-json', nullable: true })
  modelIds?: string[];

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice!: number;

  @Column({ name: 'selling_price', type: 'decimal', precision: 12, scale: 2, default: 0 })
  sellingPrice!: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 12, scale: 2 })
  totalPrice!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
