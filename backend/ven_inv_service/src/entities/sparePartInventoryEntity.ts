import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { SparePart } from './sparePartEntity';
import { Warehouse } from './warehouseEntity';
import { Vendor } from './vendorEntity';

@Entity('spare_part_inventories')
@Index(['spare_part_id', 'warehouse_id'], { unique: true }) // Unique constraint for Part+Warehouse
export class SparePartInventory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'spare_part_id' })
  spare_part_id!: string;

  @ManyToOne(() => SparePart, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spare_part_id' })
  spare_part!: SparePart;

  @Column({ name: 'warehouse_id' })
  warehouse_id!: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: Warehouse;

  @Column({ name: 'vendor_id', nullable: true })
  vendor_id?: string;

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor?: Vendor;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
