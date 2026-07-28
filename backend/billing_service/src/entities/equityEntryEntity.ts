import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// RETAINED_EARNINGS, PROFIT_TRANSFER and LOSS_TRANSFER stay valid on the type
// column (existing rows, and computeBalanceSheet's own OPENING_BALANCE_EQUITY
// handling, must keep working) but are no longer offered on the create form —
// Retained Earnings is auto-computed from all-time P&L (see accountsShared.ts,
// "3002 Retained Earnings — auto-computed... canonical formula") and manual
// entries of any of these three types are silently ignored by that computation
// while still polluting the Equity page's own separate summary/statement
// views and (if linked to a Cash/Bank account) moving real money with zero
// corresponding effect on the real Balance Sheet equity total — a confirmed,
// reproducible dead-end, not a hypothetical one. See createEquityEntry for the
// matching server-side rejection of new entries of these types.
export type EquityType =
  | 'SHARE_CAPITAL'
  | 'RETAINED_EARNINGS'
  | 'RESERVES'
  | 'OWNER_CONTRIBUTION'
  | 'DIVIDEND'
  | 'WITHDRAWAL'
  | 'PROFIT_TRANSFER'
  | 'LOSS_TRANSFER'
  | 'OPENING_BALANCE_EQUITY'
  | 'OTHER';

export type EquityReserveSource = 'FROM_RETAINED_EARNINGS' | 'DIRECT_ENTRY';

@Entity('equity_entries')
export class EquityEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  entryNo!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'varchar' })
  type!: EquityType;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount!: number;

  @Column({ default: 'AED' })
  currency!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @Column({ nullable: true })
  referenceNo?: string;

  @Column({ nullable: true, type: 'uuid' })
  linkedCashAccountId?: string;

  @Column({ nullable: true })
  documentUrl?: string;

  @Column({ nullable: true })
  notes?: string;

  // ── Type-specific fields ────────────────────────────────────────────────
  // SHARE_CAPITAL / OWNER_CONTRIBUTION / DIVIDEND (recipient) / WITHDRAWAL
  @Column({ type: 'uuid', nullable: true })
  ownerId?: string;

  // SHARE_CAPITAL / OWNER_CONTRIBUTION / DIVIDEND / WITHDRAWAL — how the money
  // actually moved. Free varchar rather than a shared PaymentMode enum import:
  // this module's payment-mode values (e.g. 'BANK_TRANSFER') already match
  // paymentTransactionEntity's informal convention elsewhere in this codebase.
  @Column({ nullable: true })
  paymentMode?: string;

  // SHARE_CAPITAL
  @Column({ type: 'int', nullable: true })
  numberOfShares?: number;

  @Column({ type: 'decimal', precision: 14, scale: 4, nullable: true })
  pricePerShare?: number;

  // RESERVES
  @Column({ nullable: true })
  reserveType?: string;

  @Column({ type: 'varchar', nullable: true })
  reserveSource?: EquityReserveSource;

  // DIVIDEND — `date` above serves as the Declaration Date (consistent with
  // every other type, where `date` means "when this event happened"); this is
  // the separate, often-later date funds actually left the account.
  @Column({ type: 'date', nullable: true })
  paymentDate?: string;

  @Column({ type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
