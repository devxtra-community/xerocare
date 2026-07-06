import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Branch } from './branchEntity';
import { Warehouse } from './warehouseEntity';
import { StockTransferItem } from './stockTransferItemEntity';

export enum TransferType {
  INTRA_BRANCH = 'INTRA_BRANCH',
  INTER_BRANCH = 'INTER_BRANCH',
}

export enum TransferStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('stock_transfers')
export class StockTransfer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'transfer_number', type: 'varchar', length: 50, unique: true })
  transfer_number!: string;

  @Column({
    name: 'transfer_type',
    type: 'enum',
    enum: TransferType,
  })
  transfer_type!: TransferType;

  @Column({
    type: 'enum',
    enum: TransferStatus,
    default: TransferStatus.DRAFT,
  })
  status!: TransferStatus;

  @Column({ name: 'source_branch_id', type: 'uuid' })
  source_branch_id!: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'source_branch_id' })
  source_branch!: Branch;

  @Column({ name: 'source_warehouse_id', type: 'uuid' })
  source_warehouse_id!: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'source_warehouse_id' })
  source_warehouse!: Warehouse;

  @Column({ name: 'destination_branch_id', type: 'uuid' })
  destination_branch_id!: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'destination_branch_id' })
  destination_branch!: Branch;

  @Column({ name: 'destination_warehouse_id', type: 'uuid' })
  destination_warehouse_id!: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'destination_warehouse_id' })
  destination_warehouse!: Warehouse;

  @Column({ name: 'requested_by_id', type: 'uuid' })
  requested_by_id!: string;

  @Column({ name: 'approved_by_id', type: 'uuid', nullable: true })
  approved_by_id?: string;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejection_reason?: string;

  @Column({ name: 'dispatched_at', type: 'timestamp', nullable: true })
  dispatched_at?: Date;

  @Column({ name: 'received_at', type: 'timestamp', nullable: true })
  received_at?: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @OneToMany(() => StockTransferItem, (item) => item.transfer, { cascade: true, eager: false })
  items!: StockTransferItem[];
}
