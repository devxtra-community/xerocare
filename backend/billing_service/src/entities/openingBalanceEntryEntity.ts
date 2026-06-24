import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Invoice } from './invoiceEntity';

export enum BalanceType {
  SALE_OUTSTANDING = 'SALE_OUTSTANDING',
  RENT_CONTRACT = 'RENT_CONTRACT',
  LEASE_CONTRACT = 'LEASE_CONTRACT',
  SERVICE_DEBT = 'SERVICE_DEBT',
  OTHER_DEBT = 'OTHER_DEBT',
}

@Entity('opening_balance_entries')
export class OpeningBalanceEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'entry_number', unique: true })
  entryNumber!: string;

  @Column({ name: 'customer_id' })
  customerId!: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @Column({ name: 'branch_name', type: 'varchar', nullable: true })
  branchName?: string;

  @Column({
    name: 'balance_type',
    type: 'enum',
    enum: BalanceType,
  })
  balanceType!: BalanceType;

  @Column({
    name: 'opening_balance',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  openingBalance!: number;

  @Column({
    name: 'remaining_balance',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  remainingBalance!: number;

  @Column({
    name: 'original_total_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  originalTotalAmount!: number;

  @Column({
    name: 'already_paid_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  alreadyPaidAmount!: number;

  @Column({ name: 'invoice_id', type: 'uuid', nullable: true })
  invoiceId?: string;

  @ManyToOne(() => Invoice, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'invoice_id' })
  invoice?: Invoice;

  @Column({ name: 'is_fully_settled', type: 'boolean', default: false })
  isFullySettled!: boolean;

  @Column({ name: 'migrated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  migratedAt!: Date;

  // Rent / Lease Migration Details
  @Column({
    name: 'monthly_billing_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | undefined) => value,
      from: (value: string | null) => (value ? Number(value) : undefined),
    },
  })
  monthlyBillingAmount?: number;

  @Column({ name: 'billing_cycle_in_days', type: 'integer', nullable: true, default: 30 })
  billingCycleInDays?: number;

  @Column({ name: 'next_payment_due_date', type: 'date', nullable: true })
  nextPaymentDueDate?: Date;

  @Column({ name: 'total_contract_months', type: 'integer', nullable: true })
  totalContractMonths?: number;

  @Column({ name: 'months_completed', type: 'integer', nullable: true })
  monthsCompleted?: number;

  @Column({ name: 'months_remaining', type: 'integer', nullable: true })
  monthsRemaining?: number;

  @Column({
    name: 'remaining_contract_value',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | undefined) => value,
      from: (value: string | null) => (value ? Number(value) : undefined),
    },
  })
  remainingContractValue?: number;

  @Column({ name: 'contract_start_date', type: 'date', nullable: true })
  contractStartDate?: Date;

  // Machine / Asset Details
  @Column({ name: 'product_brand', type: 'varchar', nullable: true })
  productBrand?: string;

  @Column({ name: 'product_model', type: 'varchar', nullable: true })
  productModel?: string;

  @Column({ name: 'serial_number', type: 'varchar', nullable: true })
  serialNumber?: string;

  @Column({ name: 'product_id', type: 'varchar', nullable: true })
  productId?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
