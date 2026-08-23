import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cheques')
export class Cheque {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'cheque_no' })
  chequeNo!: string;

  @Column({ name: 'bank_name', type: 'varchar', nullable: true })
  bankName?: string;

  @Column({ name: 'party_name' })
  partyName!: string;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  // Deprecated: kept only so the column stays populated for any code that still reads
  // it and to avoid a destructive migration. No longer collected or shown as its own
  // concept — chequeDate is now the single source of truth for "when can this cheque
  // be presented," and every write path sets dueDate = chequeDate automatically.
  @Column({ name: 'due_date', type: 'date' })
  dueDate!: Date;

  // THE deposit/presentment-eligibility date — "Cheque Date" in the UI: the earliest
  // date this cheque can legally be deposited (RECEIVED) or presented for clearing
  // (ISSUED). Captured once at creation and never overwritten by later lifecycle
  // actions (unlike the legacy issueDate column, which used to be silently reused for
  // deposit/issue dates too). Required going forward — see the backfill in
  // runPreMigrations for any pre-existing row where it was still null.
  @Column({ name: 'cheque_date', type: 'date', nullable: true })
  chequeDate?: Date;

  // RECEIVED only: the date this cheque was physically collected from the customer —
  // independent of chequeDate, since a post-dated cheque is often collected well
  // before the date written on it. Not applicable to ISSUED cheques (issueDate below
  // already covers "when we handed it to the vendor").
  @Column({ name: 'collected_date', type: 'date', nullable: true })
  collectedDate?: Date;

  @Column({ name: 'issue_date', type: 'date', nullable: true })
  issueDate?: Date;

  // Set when a RECEIVED cheque is deposited (Part 2) — previously this overwrote
  // issueDate, losing the original cheque date.
  @Column({ name: 'deposit_date', type: 'date', nullable: true })
  depositDate?: Date;

  // Set when a cheque is marked Cleared — the actual date cash was confirmed
  // received/paid, editable at the time of clearing (defaults to today).
  @Column({ name: 'cleared_date', type: 'date', nullable: true })
  clearedDate?: Date;

  @Column({ name: 'type', default: 'RECEIVED' })
  type!: string; // RECEIVED | ISSUED

  @Column({ name: 'status', default: 'PENDING' })
  status!: string; // PENDING | DEPOSITED | CLEARED | BOUNCED | CANCELLED | ISSUED

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @Column({ name: 'account_id', type: 'uuid', nullable: true })
  accountId?: string;

  @Column({ name: 'cashbook_entry_id', type: 'uuid', nullable: true })
  cashbookEntryId?: string;

  // Source tracing — which bill/PO/expense generated this cheque
  @Column({ name: 'source_type', type: 'varchar', nullable: true })
  sourceType?: string; // SALE | RENT | LEASE | PURCHASE | EXPENSE

  @Column({ name: 'source_reference_id', type: 'uuid', nullable: true })
  sourceReferenceId?: string;

  @Column({ name: 'source_label', type: 'varchar', length: 500, nullable: true })
  sourceLabel?: string; // e.g. "Invoice INV-0012" or "Rent RC-0012 — July 2026"

  @Column({ name: 'invoice_no', type: 'varchar', length: 100, nullable: true })
  invoiceNo?: string;

  @Column({ name: 'created_by' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
