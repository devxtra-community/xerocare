import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum GuaranteeChequeStatus {
  RECEIVED = 'RECEIVED',
  RETURNED = 'RETURNED',
  DEPOSITED = 'DEPOSITED',
}

export enum GuaranteeChequePurpose {
  PERFORMANCE_SECURITY = 'PERFORMANCE_SECURITY',
  OTHER = 'OTHER',
}

// Guarantee cheque lifecycle: RECEIVED → DEPOSITED (cheque cleared to bank) or RECEIVED → RETURNED (cheque returned to customer)
// Depositing creates a RECEIPT cashbook entry on the chosen bank account.
@Entity('guarantee_cheques')
export class GuaranteeCheque {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 255 })
  customerName!: string;

  @Column({ name: 'contract_invoice_id', type: 'uuid', nullable: true })
  contractInvoiceId?: string | null;

  @Column({ name: 'contract_reference', type: 'varchar', length: 255, nullable: true })
  contractReference?: string | null;

  @Column({ name: 'cheque_number', type: 'varchar', length: 100 })
  chequeNumber!: string;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ name: 'currency_code', type: 'varchar', length: 3, default: 'AED' })
  currencyCode!: string;

  @Column({ name: 'bank_name', type: 'varchar', length: 150 })
  bankName!: string;

  @Column({ name: 'received_date', type: 'date' })
  receivedDate!: Date;

  @Column({
    name: 'purpose',
    type: 'enum',
    enum: GuaranteeChequePurpose,
    default: GuaranteeChequePurpose.PERFORMANCE_SECURITY,
  })
  purpose!: GuaranteeChequePurpose;

  @Column({
    name: 'status',
    type: 'enum',
    enum: GuaranteeChequeStatus,
    default: GuaranteeChequeStatus.RECEIVED,
  })
  status!: GuaranteeChequeStatus;

  @Column({ name: 'returned_date', type: 'date', nullable: true })
  returnedDate?: Date | null;

  @Column({ name: 'deposited_date', type: 'date', nullable: true })
  depositedDate?: Date | null;

  @Column({ name: 'deposited_to_account_id', type: 'uuid', nullable: true })
  depositedToAccountId?: string | null;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
