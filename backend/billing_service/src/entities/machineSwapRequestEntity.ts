import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SwapRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('machine_swap_requests')
export class MachineSwapRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  @Index()
  branchId!: string;

  @Column({ name: 'contract_id', type: 'uuid' })
  @Index()
  contractId!: string;

  @Column({ name: 'invoice_number', type: 'varchar', length: 100 })
  invoiceNumber!: string;

  @Column({ name: 'contract_type', type: 'varchar', length: 50 })
  contractType!: string; // SALE | RENT | LEASE

  @Column({ name: 'customer_name', type: 'varchar', length: 255, nullable: true })
  customerName?: string;

  @Column({ name: 'model_id', type: 'uuid', nullable: true })
  modelId?: string;

  @Column({ name: 'model_name', type: 'varchar', length: 255, nullable: true })
  modelName?: string;

  // Old unit
  @Column({ name: 'current_product_id', type: 'uuid', nullable: true })
  currentProductId?: string;

  @Column({ name: 'current_serial_number', type: 'varchar', length: 255 })
  currentSerialNumber!: string;

  // Replacement unit
  @Column({ name: 'requested_product_id', type: 'uuid' })
  requestedProductId!: string;

  @Column({ name: 'requested_serial_number', type: 'varchar', length: 255 })
  requestedSerialNumber!: string;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason?: string;

  @Column({ name: 'requested_by_id', type: 'uuid' })
  requestedById!: string;

  @Column({ name: 'requested_by_name', type: 'varchar', length: 255 })
  requestedByName!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: SwapRequestStatus,
    default: SwapRequestStatus.PENDING,
  })
  @Index()
  status!: SwapRequestStatus;

  @Column({ name: 'reviewed_by_id', type: 'uuid', nullable: true })
  reviewedById?: string;

  @Column({ name: 'reviewed_by_name', type: 'varchar', length: 255, nullable: true })
  reviewedByName?: string;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ name: 'swap_executed_at', type: 'timestamptz', nullable: true })
  swapExecutedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
