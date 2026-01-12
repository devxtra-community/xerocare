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
import { Warehouse } from './warehouseEntity';
import { Model } from './modelEntity';

@Entity('inventory')
@Unique(['model', 'warehouse'])
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Model, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'model_id' })
  model!: Model;

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
