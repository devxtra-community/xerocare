import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('income_entries')
export class IncomeEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  incomeNo!: string;

  @Column({ type: 'date' })
  date!: Date;

  @Column()
  category!: string; // free text — matches a chart_of_accounts.categoryKey for an INCOME_CATEGORY_LINKED account

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
  status!: string; // PENDING | APPROVED | RECEIVED | REJECTED

  @Column({ type: 'uuid', nullable: true })
  receivedTo?: string; // cash_bank_accounts id

  @Column({ type: 'date', nullable: true })
  receivedDate?: Date;

  @Column({ type: 'varchar', nullable: true })
  receivedMode?: string;

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
