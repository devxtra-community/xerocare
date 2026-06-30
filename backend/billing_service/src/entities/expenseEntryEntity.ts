import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('expense_entries')
export class ExpenseEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  expenseNo!: string;

  @Column({ type: 'date' })
  date!: Date;

  @Column()
  category!: string; // SALARY | TRAVEL | RENT | UTILITIES | SPARE_PARTS | LABOUR | VENDOR_PURCHASE | MARKETING | MAINTENANCE | INSURANCE | DEPRECIATION | OTHER

  @Column({ type: 'varchar', nullable: true })
  subCategory?: string;

  @Column({ type: 'text' })
  description!: string;

  @Column()
  branchId!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  vatAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  netAmount!: number;

  @Column({ length: 3, default: 'AED' })
  currency!: string;

  @Column({ default: 'PENDING' })
  status!: string; // PENDING | APPROVED | PAID | REJECTED

  @Column({ type: 'uuid', nullable: true })
  paidFrom?: string; // cash_bank_accounts id

  @Column({ type: 'date', nullable: true })
  paymentDate?: Date;

  @Column({ type: 'varchar', nullable: true })
  paymentMode?: string;

  @Column({ type: 'varchar', nullable: true })
  referenceNo?: string;

  @Column({ type: 'uuid', nullable: true })
  approvedBy?: string;

  @Column({ type: 'varchar', nullable: true })
  receiptUrl?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column()
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
