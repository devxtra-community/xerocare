import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './productEntity';
import { Warehouse } from './warehouseEntity';

@Entity('inventory')
@Unique(['product', 'warehouse'])
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Product, (p) => p.inventory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @ManyToOne(() => Warehouse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: Warehouse;

  @Column({ type: 'int', default: 0 })
  total_qty!: number;

  @Column({ type: 'int', default: 0 })
  available_qty!: number;

  @Column({ type: 'int', default: 0 })
  damaged_qty!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
