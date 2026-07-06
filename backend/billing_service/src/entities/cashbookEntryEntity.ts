import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CashBankAccount } from './cashBankAccountEntity';

@Entity('cashbook_entries')
export class CashbookEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  referenceNo!: string;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'uuid', nullable: true })
  accountId?: string;

  @ManyToOne(() => CashBankAccount, { nullable: true })
  @JoinColumn({ name: 'accountId' })
  account?: CashBankAccount;

  @Column()
  entryType!: string; // RECEIPT | PAYMENT

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column()
  category!: string; // Customer Payment | Vendor Payment | Salary | Expense | Transfer | Other

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'uuid', nullable: true })
  linkedInvoiceId?: string;

  @Column({ type: 'uuid', nullable: true })
  linkedPoId?: string;

  @Column({ type: 'uuid', nullable: true })
  linkedExpenseId?: string;

  @Column({ type: 'varchar', nullable: true })
  paymentMode?: string; // Cash | Bank Transfer | Cheque | Card

  @Column({ type: 'varchar', nullable: true })
  chequeNo?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Auto-posting source link (idempotency). e.g. INVOICE_PAYMENT | EXPENSE
  @Column({ type: 'varchar', nullable: true })
  sourceType?: string;

  @Column({ type: 'uuid', nullable: true })
  sourceId?: string;

  @Column()
  createdBy!: string;

  @Column()
  branchId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
