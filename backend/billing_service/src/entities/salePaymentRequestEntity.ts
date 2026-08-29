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

  // Security Deposit flag: identifies this payment as a refundable caution/security deposit
  // collected during quotation conversion. This separates it from normal rent/sale revenue
  // in Accounts, ensuring deposits are never treated as rental income.
  @Column({ type: 'boolean', default: false })
  isSecurityDeposit!: boolean;

  // Context distinguishes advance vs periodic collection for display in Accounts queue.
  // SALE | RENT_ADVANCE | RENT_PERIODIC | LEASE_ADVANCE | LEASE_PERIODIC
  @Column({ type: 'varchar', nullable: true })
  paymentContext?: string;

  // Links a RENT_PERIODIC/LEASE_PERIODIC collection to the specific billing period
  // (UsageRecord) it pays toward, so a partial payment's shortfall can be tracked and
  // later topped up against that same period. Null for advances and Sale payments.
  @Index()
  @Column({ type: 'uuid', nullable: true })
  usageRecordId?: string;

  // VAT breakdown for a RENT_ADVANCE/LEASE_ADVANCE collection — taxableAmount is the
  // entered pre-tax advance, taxAmount is VAT on it at the contract's own snapshotted
  // taxPercent, and `amount` (above) is taxableAmount + taxAmount. Periodic (usage-bill)
  // collections don't set these here — their VAT is already layered into UsageRecord's
  // totalCharge upstream, so `amount` there is simply whatever portion of that
  // tax-inclusive total was collected. Null/0 for Sale payments and no-tax branches.
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  taxableAmount?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  taxAmount?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  taxPercent?: number;

  // Security Deposit refund — Cash/Bank deposits only (a Cheque deposit is refunded by
  // returning the GuaranteeCheque instead, see guaranteeChequesRoutes.ts's /:id/return;
  // that path never touches these fields). Set together, once, by refundSecurityDeposit —
  // there is no un-refund action, matching every other one-way state transition on this
  // entity (PENDING→APPROVED/REJECTED).
  @Column({ type: 'boolean', default: false })
  isRefunded!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  refundedById?: string;

  @Column({ type: 'varchar', nullable: true })
  refundedByName?: string;

  // Which Cash/Bank account the refund was paid out from — the CashbookEntry (and the
  // account's currentBalance reduction) it produced is the actual accounting record;
  // this is just for display back on this request.
  @Column({ type: 'uuid', nullable: true })
  refundCashAccountId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
