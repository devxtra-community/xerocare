import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Invoice } from './invoiceEntity';
import { UsageRecordItem } from './usageRecordItemEntity';

export enum ReportedBy {
  CUSTOMER = 'CUSTOMER',
  EMPLOYEE = 'EMPLOYEE',
}

@Entity('usage_records')
export class UsageRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  contractId!: string;

  @ManyToOne(() => Invoice)
  @JoinColumn({ name: 'contractId' })
  contract!: Invoice;

  @Column({ type: 'date' })
  billingPeriodStart!: Date;

  @Column({ type: 'date' })
  billingPeriodEnd!: Date;

  // The actual date the meter reading was physically taken/recorded by Finance or the
  // technician — distinct from billingPeriodEnd (the period's calendar end date, which
  // this often lags behind by a few days). Defaults to "today" at creation when Finance
  // doesn't override it. Shown on the bill so the customer can see exactly when the
  // reading it's based on was taken.
  @Column({ type: 'date', nullable: true })
  readingTakenDate?: Date;

  // Raw Readings (A4/A3 Separation)
  @Column({ type: 'int', default: 0 })
  bwA4Count!: number;

  @Column({ type: 'int', default: 0 })
  bwA3Count!: number;

  @Column({ type: 'int', default: 0 })
  colorA4Count!: number;

  @Column({ type: 'int', default: 0 })
  colorA3Count!: number;

  // Monthly Consumption (Delta)
  @Column({ type: 'int', default: 0 })
  bwA4Delta!: number;

  @Column({ type: 'int', default: 0 })
  bwA3Delta!: number;

  @Column({ type: 'int', default: 0 })
  colorA4Delta!: number;

  @Column({ type: 'int', default: 0 })
  colorA3Delta!: number;

  @Column({ type: 'int', default: 0 })
  exceededTotal!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  exceededCharge!: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  monthlyRent!: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  advanceAdjusted!: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalCharge!: number;

  // VAT breakdown for this period's charge, layered on top of the existing pricing
  // calculation (base rent + excess usage − discount) — taxableAmount is that pre-tax
  // result, taxAmount is VAT on it at the contract's own snapshotted taxPercent, and
  // totalCharge (above) is taxableAmount + taxAmount. Zero/null for no-tax branches.
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxableAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  taxPercent?: number;

  @Column({ type: 'int', default: 0 })
  discountBwCopies!: number;

  @Column({ type: 'int', default: 0 })
  discountColorCopies!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount!: number;

  @Column({
    type: 'enum',
    enum: ReportedBy,
    default: ReportedBy.EMPLOYEE,
  })
  reportedBy!: ReportedBy;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  // Meter Reading Image (R2)
  @Column({ type: 'text', nullable: true })
  meterImageUrl?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  emailSentAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  whatsappSentAt?: Date;

  // ─── Bill creation + customer approval (Stage A) ─────────────────────────────
  // A UsageRecord doubles as the period's Bill. It must be Customer Approved
  // (via the remote link or a Finance manual override with a note) before any
  // payment collection may be recorded against it — see collectPendingUsagePayment.
  @Column({ type: 'varchar', default: 'PENDING_APPROVAL' })
  billStatus!: string; // PENDING_APPROVAL | CUSTOMER_APPROVED | CUSTOMER_REJECTED

  // Distinguishes a periodic usage Bill (billingPeriodStart/End is a real period, meter
  // readings apply) from an Advance Bill (wraps the contract's already-collected
  // RENT_ADVANCE/LEASE_ADVANCE SalePaymentRequest for customer sign-off only — no period,
  // no readings; billingPeriodStart/End is set to the advance's paymentDate as a
  // placeholder so the NOT NULL columns stay meaningful) or a Security Deposit Bill
  // (identical shape, wrapping RENT_SECURITY_DEPOSIT/LEASE_SECURITY_DEPOSIT instead —
  // see generateSecurityDepositBill). Both non-USAGE types are excluded from every AR/
  // receivable sum over this table (accountsShared.ts, lineItemDrilldownController.ts) —
  // ADVANCE because it's counted separately via its own SalePaymentRequest join, and
  // SECURITY_DEPOSIT because a deposit is a refundable liability, not revenue at all.
  // Reuses the exact same entity/approval-pipeline for all three rather than a parallel
  // implementation.
  @Column({ type: 'varchar', default: 'USAGE' })
  billType!: string; // USAGE | ADVANCE | SECURITY_DEPOSIT

  @Column({ type: 'uuid', nullable: true })
  billCreatedByEmployeeId?: string;

  @Column({ type: 'varchar', nullable: true })
  billCreatedByName?: string;

  @Column({ type: 'timestamp', nullable: true })
  billSentAt?: Date;

  // Remote signing token (mirrors ContractAgreement's signing-token fields)
  @Column({ type: 'varchar', nullable: true, unique: true })
  signingToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  signingTokenExpiresAt?: Date;

  @Column({ type: 'boolean', default: false })
  signingTokenUsed!: boolean;

  @Column({ type: 'varchar', nullable: true })
  customerApprovedByName?: string;

  @Column({ type: 'timestamp', nullable: true })
  customerApprovedAt?: Date;

  @Column({ type: 'varchar', nullable: true })
  customerApprovalMethod?: string; // REMOTE_LINK | FINANCE_MANUAL

  @Column({ type: 'text', nullable: true })
  customerApprovalNote?: string; // required attestation when FINANCE_MANUAL

  @Column({ type: 'text', nullable: true })
  customerRejectionReason?: string;

  @Column({ type: 'timestamp', nullable: true })
  customerRejectedAt?: Date;

  @OneToMany(() => UsageRecordItem, (item) => item.usageRecord)
  items!: UsageRecordItem[];
}
