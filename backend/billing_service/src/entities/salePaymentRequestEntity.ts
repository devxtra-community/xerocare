import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('sale_payment_requests')
export class SalePaymentRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  requestNo!: string; // SPAY-YYYY-NNNN

  @Index()
  @Column({ type: 'uuid' })
  invoiceId!: string;

  @Column({ type: 'varchar' })
  invoiceNumber!: string; // snapshot

  @Index()
  @Column({ type: 'uuid' })
  branchId!: string;

  // Who recorded this payment
  @Column({ type: 'uuid' })
  recordedByEmployeeId!: string;

  @Column({ type: 'varchar' })
  recordedByEmployeeName!: string;

  // Customer snapshot
  @Column({ type: 'varchar' })
  customerName!: string;

  // Payment details
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ length: 3, default: 'AED' })
  currency!: string;

  @Column({ type: 'varchar' })
  paymentMode!: string; // CASH | BANK_TRANSFER | CHEQUE

  @Column({ type: 'date' })
  paymentDate!: Date;

  @Column({ type: 'varchar', nullable: true })
  referenceNumber?: string;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  // For Cash/Bank: which account to move money into
  @Column({ type: 'uuid', nullable: true })
  cashAccountId?: string;

  // Cheque fields
  @Column({ type: 'varchar', nullable: true })
  chequeNumber?: string;

  @Column({ type: 'varchar', nullable: true })
  chequeBankName?: string;

  @Column({ type: 'date', nullable: true })
  chequeDueDate?: Date;

  @Column({ type: 'date', nullable: true })
  chequeDate?: Date;

  // Receipt URL (generated after Finance approval)
  @Column({ type: 'varchar', nullable: true })
  receiptUrl?: string;

  // Approval gate
  @Column({ type: 'varchar', default: 'PENDING' })
  status!: string; // PENDING | APPROVED | REJECTED

  @Column({ type: 'uuid', nullable: true })
  reviewedById?: string;

  @Column({ type: 'varchar', nullable: true })
  reviewedByName?: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  // ID of the PaymentTransaction created when approved
  @Column({ type: 'uuid', nullable: true })
  paymentTransactionId?: string;

  // "Collect Later" flag: Finance pre-entered payment details but hasn't physically received cash yet.
  // Accounts confirms receipt when it arrives (same approve flow, different label).
  @Column({ type: 'boolean', default: false })
  collectLater!: boolean;

  // Context distinguishes advance vs periodic collection for display in Accounts queue.
  // SALE | RENT_ADVANCE | RENT_PERIODIC | LEASE_ADVANCE | LEASE_PERIODIC
  @Column({ type: 'varchar', nullable: true })
  paymentContext?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
