import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { Model } from './modelEntity';
import { Warehouse } from './warehouseEntity';
export enum ProductStatus {
  AVAILABLE = 'AVAILABLE',
  RENTED = 'RENTED',
  LEASE = 'LEASE',
  SOLD = 'SOLD',
  DAMAGED = 'DAMAGED',
}

export enum PrintColour {
  BLACK_WHITE = 'BLACK_WHITE',
  COLOUR = 'COLOUR',
  BOTH = 'BOTH',
}

import { Vendor } from './vendorEntity';
import { SparePart } from './sparePartEntity';

@Entity('products')
@Check(
  `("model_id" IS NOT NULL AND "spare_part_id" IS NULL) OR ("model_id" IS NULL AND "spare_part_id" IS NOT NULL)`,
)
@Check(`"max_discount_amount" >= 0`)
@Check(`"max_discount_amount" <= "sale_price"`)
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

  @ManyToOne(() => SparePart, { nullable: true })
  @JoinColumn({ name: 'spare_part_id' })
  spare_part?: SparePart;

  @Column({ type: 'uuid' })
  @Index() // Optimizes GROUP BY vendor_id
  vendor_id!: string;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor!: Vendor;

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

  @Column({ type: 'varchar', length: 1000, nullable: true })
  imageUrl?: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
