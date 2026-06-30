import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CashBankAccount } from './cashBankAccountEntity';

@Entity('account_reconciliations')
export class AccountReconciliation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  accountId!: string;

  @ManyToOne(() => CashBankAccount, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account!: CashBankAccount;

  @Column({ type: 'date' })
  reconciliationDate!: Date;

  @Column({ type: 'date' })
  statementDate!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  bookBalance!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  statementBalance!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  difference!: number;

  @Column({ default: false })
  isBalanced!: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column()
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
