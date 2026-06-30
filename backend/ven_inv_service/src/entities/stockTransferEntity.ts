import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
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
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  PARTIALLY_ACCEPTED = 'PARTIALLY_ACCEPTED',
  REJECTED = 'REJECTED',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('stock_transfers')
export class StockTransfer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'transfer_number', type: 'varchar', unique: true })
  transfer_number!: string;

  @Column({
    name: 'transfer_type',
    type: 'varchar',
    length: 20,
    default: TransferType.INTER_BRANCH,
  })
  transfer_type!: TransferType;

  @Column({ name: 'status', type: 'varchar', length: 30, default: TransferStatus.DRAFT })
  status!: TransferStatus;

  @Column({ name: 'requesting_branch_id', type: 'varchar' })
  requesting_branch_id!: string;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requesting_branch_id' })
  requesting_branch!: Branch;

  @Column({ name: 'requesting_warehouse_id', type: 'varchar', nullable: true })
  requesting_warehouse_id!: string;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'requesting_warehouse_id' })
  requesting_warehouse!: Warehouse;

  @Column({ name: 'source_branch_id', type: 'varchar' })
  source_branch_id!: string;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_branch_id' })
  source_branch!: Branch;

  @Column({ name: 'source_warehouse_id', type: 'varchar', nullable: true })
  source_warehouse_id!: string;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'source_warehouse_id' })
  source_warehouse!: Warehouse;

  @Column({ name: 'requested_by_id', type: 'varchar' })
  requested_by_id!: string;

  @Column({ name: 'responded_by_id', type: 'varchar', nullable: true })
  responded_by_id!: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejection_reason!: string;

  @Column({ name: 'responded_at', type: 'timestamp', nullable: true })
  responded_at!: Date;

  @Column({ name: 'dispatched_at', type: 'timestamp', nullable: true })
  dispatched_at!: Date;

  @Column({ name: 'received_at', type: 'timestamp', nullable: true })
  received_at!: Date;

  @OneToMany(() => StockTransferItem, (item) => item.transfer, { cascade: true })
  items!: StockTransferItem[];

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
