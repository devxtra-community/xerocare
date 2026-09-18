import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { PayablePayment } from './payablePaymentEntity';

@Entity('manual_payables')
export class ManualPayable {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  referenceNo!: string;

  @Column()
  type!: string; // VENDOR_INVOICE | SALARY_PAYABLE | RENT_PAYABLE | UTILITY_PAYABLE | OTHER

  @Column()
  payableTo!: string;

  @Column({ type: 'uuid', nullable: true })
  vendorId?: string;

  @Column({ type: 'uuid', nullable: true })
  employeeId?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ length: 3, default: 'AED' })
  currency!: string;

  @Column({ type: 'date' })
  issueDate!: Date;

  @Column({ type: 'date' })
  dueDate!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amountPaid!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  outstanding?: number;

  @Column({ default: 'PENDING' })
  status!: string; // PENDING | PARTIAL | PAID | OVERDUE

  @Column({ type: 'uuid', nullable: true })
  linkedPurchaseId?: string;

  @Column()
  branchId!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column()
  createdBy!: string;

  @OneToMany(() => PayablePayment, (p) => p.payable)
  payments?: PayablePayment[];

  // ── Credit Note settlement-approval gate ────────────────────────────────────
  // Set only by the Credit Note workflow. Their presence is what makes this row
  // un-settleable until Accounts approves — see requiresSettlementApproval().

  /** The Credit Note this settlement discharges. Also the idempotency key. */
  @Column({ type: 'uuid', nullable: true })
  creditNoteId?: string;

  /** Snapshot of the credit note's human reference, so Accounts can read the queue
   *  without joining back. */
  @Column({ type: 'varchar', nullable: true })
  creditNoteNo?: string;

  /** CUSTOMER_TO_COMPANY (collection) | COMPANY_TO_CUSTOMER (refund). */
  @Column({ type: 'varchar', nullable: true })
  paymentDirection?: string;

  /** Accounts' decision: PENDING | APPROVED | REJECTED. Distinct from `status`,
   *  which says whether the money has actually moved. */
  @Column({ type: 'varchar', nullable: true })
  approvalStatus?: string;

  @Column({ type: 'uuid', nullable: true })
  approvedBy?: string;

  @Column({ type: 'varchar', nullable: true })
  approvedByName?: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  /** Reference of the real payment that settled this, written at settlement time. */
  @Column({ type: 'varchar', nullable: true })
  settlementReference?: string;

  @Column({ type: 'timestamp', nullable: true })
  settledAt?: Date;

  /** Amount breakdown, stored so Accounts and the Receivables/Payables pages can show
   *  the arithmetic without recomputing it from the credit note.
   *  netAmount + taxAmount === amount. */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  netAmount?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  taxAmount?: number;

  /** The replacementDiscount already deducted in arriving at netAmount. Kept for display
   *  and audit; it is NOT a separate posting — see the revenue treatment in
   *  accountsShared.ts, where a discount reduces recognised revenue exactly as an
   *  invoice-line discount does. */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  discountAmount?: number;

  @CreateDateColumn()
  createdAt!: Date;
}
