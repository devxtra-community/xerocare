import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
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

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Model, (model) => model.products)
  @JoinColumn({ name: 'model_id' })
  model!: Model;
  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: Warehouse;

  @Column({ type: 'uuid' })
  vendor_id!: string;

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

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  sale_price!: number;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.AVAILABLE,
  })
  product_status!: ProductStatus;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  imageUrl?: string;

  @CreateDateColumn()
  created_at!: Date;
}
