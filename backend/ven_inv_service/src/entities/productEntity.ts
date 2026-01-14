import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Model } from './modelEntity';
import { Inventory } from './inventoryEntity';
export enum ProductStatus {
  AVAILABLE = 'AVAILABLE',
  RENTED = 'RENTED',
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

  @Column({ nullable: true })
  vendor_id!: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  serial_no!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  brand!: string;

  @Column({ type: 'date' })
  MFD!: Date;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  rent_price_monthly!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  rent_price_yearly!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  lease_price_monthly!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  lease_price_yearly!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  sale_price!: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  tax_rate!: number;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.AVAILABLE,
    nullable: true,
  })
  product_status!: ProductStatus;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  imageUrl?: string;

  @CreateDateColumn()
  created_at!: Date;

  // One product can exist in multiple warehouses
  @OneToMany(() => Inventory, (inventory) => inventory.product)
  inventory!: Inventory[];
}
