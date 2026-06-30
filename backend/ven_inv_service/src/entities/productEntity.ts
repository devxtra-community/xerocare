import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
  Check,
  BeforeInsert,
} from 'typeorm';
import { Model } from './modelEntity';
import { Warehouse } from './warehouseEntity';
export enum ProductStatus {
  AVAILABLE = 'AVAILABLE',
  RENTED = 'RENTED',
  LEASE = 'LEASE',
  SOLD = 'SOLD',
  DAMAGED = 'DAMAGED',
  RETURNED = 'RETURNED',
}

export enum OwnershipType {
  RENT = 'RENT',
  LEASE = 'LEASE',
  SALE = 'SALE',
  EXTERNAL = 'EXTERNAL',
}

export enum PrintColour {
  BLACK_WHITE = 'BLACK_WHITE',
  COLOUR = 'COLOUR',
  BOTH = 'BOTH',
}

import { Vendor } from './vendorEntity';
import { SparePart } from './sparePartEntity';
import { Lot } from './lotEntity';

@Entity('products')
// @Check(
//   `("model_id" IS NOT NULL AND "spare_part_id" IS NULL) OR ("model_id" IS NULL AND "spare_part_id" IS NOT NULL)`,
// )
@Check(`"max_discount_amount" >= 0`)
// Removed: @Check(`"max_discount_amount" <= "sale_price"`) - validation moved to application layer
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  model_id!: string;

  @ManyToOne(() => Model, (model) => model.products)
  @JoinColumn({ name: 'model_id' })
  model!: Model;

  @Column({ type: 'uuid' })
  @Index()
  warehouse_id!: string;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: Warehouse;

  @Column({ name: 'spare_part_id', nullable: true })
  spare_part_id?: string;

  @ManyToOne(() => SparePart, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'spare_part_id' })
  spare_part?: SparePart;

  @Column({ type: 'uuid' })
  @Index() // Optimizes GROUP BY vendor_id
  vendor_id!: string;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor!: Vendor;

  @Column({ name: 'lot_id', nullable: true })
  lot_id?: string;

  @ManyToOne(() => Lot, { nullable: true })
  @JoinColumn({ name: 'lot_id' })
  lot?: Lot;

  @Column({ type: 'varchar', length: 255, unique: true })
  serial_no!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  brand!: string;

  @Column({ type: 'date' })
  MFD!: Date;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  tax_rate!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  sale_price!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  purchase_price?: number;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.AVAILABLE,
    nullable: true,
  })
  @Index() // Optimizes getInventoryStats filtering
  product_status!: ProductStatus;

  @Column({
    type: 'enum',
    enum: PrintColour,
    default: PrintColour.BLACK_WHITE,
    enumName: 'print_colour_enum',
    nullable: true,
  })
  print_colour!: PrintColour;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    nullable: true,
  })
  max_discount_amount!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  wholesale_price!: number;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  imageUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  features?: { subHeading: string; description: string }[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  hs_code?: string;

  @Column({ type: 'jsonb', nullable: true })
  consumables?: { partName: string; description: string; yield: string; price: string }[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  warranty?: string;

  @Column({ name: 'barcode_id', type: 'varchar', length: 255, nullable: true, unique: true })
  barcode_id?: string;

  @Column({
    type: 'enum',
    enum: OwnershipType,
    default: OwnershipType.SALE,
    nullable: true,
  })
  ownership!: OwnershipType;

  @Column({ name: 'warranty_start_date', type: 'timestamp', nullable: true })
  warranty_start_date?: Date | null;

  @Column({ name: 'warranty_end_date', type: 'timestamp', nullable: true })
  warranty_end_date?: Date | null;

  @Column({ name: 'warranty_max_pages', type: 'int', nullable: true, default: 200000 })
  warranty_max_pages?: number | null;

  @Column({ name: 'meter_reading', type: 'int', default: 0, nullable: true })
  meter_reading?: number;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customer_id?: string | null;

  @Column({
    name: 'transfer_status',
    type: 'varchar',
    length: 20,
    default: 'NONE',
    nullable: true,
  })
  transfer_status?: 'NONE' | 'COMMITTED' | 'IN_TRANSIT';

  @BeforeInsert()
  generateBarcodeId() {
    if (!this.barcode_id && this.serial_no) {
      this.barcode_id = `XC-P-${this.serial_no}`;
    }
  }

  @CreateDateColumn()
  created_at!: Date;
}
