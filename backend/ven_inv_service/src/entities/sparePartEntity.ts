import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Model } from './modelEntity';
import { Branch } from './branchEntity';
import { Lot } from './lotEntity';
import { Warehouse } from './warehouseEntity';
import { Vendor } from './vendorEntity';

@Entity('spare_parts')
export class SparePart {
  @PrimaryGeneratedColumn('uuid')
  @Index()
  id!: string;

  @Column({ name: 'item_code', nullable: false, unique: true })
  @Index()
  sku!: string;

  @Column({ name: 'mpn', nullable: true })
  @Index()
  mpn?: string;

  @Column({ name: 'part_name' })
  part_name!: string;

  @Column({ name: 'brand' })
  brand!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'compatible_models', type: 'text', nullable: true })
  compatible_models?: string;

  @Column({ name: 'model_id', type: 'uuid', nullable: true }) // Nullable implies universal parts
  model_id?: string;

  @ManyToOne(() => Model, { nullable: true })
  @JoinColumn({ name: 'model_id' })
  model?: Model;

  @ManyToMany(() => Model, { nullable: true })
  @JoinTable({
    name: 'spare_parts_models',
    joinColumn: { name: 'spare_part_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'model_id', referencedColumnName: 'id' },
  })
  models?: Model[];

  @Column({ name: 'branch_id', type: 'uuid' })
  @Index()
  branch_id!: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch;

  @Column({ name: 'lot_id', type: 'uuid', nullable: true })
  lot_id?: string;

  @ManyToOne(() => Lot, { nullable: true })
  @JoinColumn({ name: 'lot_id' })
  lot?: Lot;

  @Column({ name: 'warehouse_id', type: 'uuid', nullable: true })
  warehouse_id?: string;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse?: Warehouse;

  @Column({ name: 'vendor_id', type: 'uuid', nullable: true })
  vendor_id?: string;

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor?: Vendor;

  @Column({ name: 'base_price', type: 'decimal', precision: 12, scale: 2, default: 0 })
  base_price!: number;

  @Column({ name: 'purchase_price', type: 'decimal', precision: 12, scale: 2, default: 0 })
  purchase_price!: number;

  @Column({ name: 'wholesale_price', type: 'decimal', precision: 12, scale: 2, default: 0 })
  wholesale_price!: number;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @Column({ nullable: true })
  image_url?: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
