import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Inventory } from './inventoryEntity';

export enum StockMovementType {
  IN = 'IN',
  OUT = 'OUT',
  DAMAGE = 'DAMAGE',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
}

@Entity('inventory_movements')
export class InventoryMovement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Inventory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventory_id' })
  inventory!: Inventory;

  @Column({ type: 'enum', enum: StockMovementType })
  type!: StockMovementType;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference?: string; // invoice id / transfer id

  @CreateDateColumn()
  created_at!: Date;
}
