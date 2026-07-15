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

  @Column({ name: 'due_date', type: 'date' })
  dueDate!: Date;

  @Column({ name: 'issue_date', type: 'date', nullable: true })
  issueDate?: Date;

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
