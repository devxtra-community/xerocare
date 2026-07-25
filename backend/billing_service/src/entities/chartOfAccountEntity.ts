import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('chart_of_accounts')
export class ChartOfAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  accountNumber!: string; // e.g. '1001', '1001-01' (sub-account of 1001)

  @Column()
  accountName!: string;

  @Column()
  category!: string; // ASSET | LIABILITY | EQUITY | INCOME | EXPENSE

  @Column()
  accountGroup!: string; // CURRENT_ASSET | NON_CURRENT_ASSET | CURRENT_LIABILITY | NON_CURRENT_LIABILITY | EQUITY | INCOME | EXPENSE

  @Column({ type: 'uuid', nullable: true })
  parentAccountId?: string;

  @Column()
  sourceType!: string; // SYSTEM | CASH_BANK_LINKED | EXPENSE_CATEGORY_LINKED | INCOME_CATEGORY_LINKED | MANUAL_JOURNAL

  @Column({ default: false })
  isSystemDefault!: boolean;

  @Column({ type: 'uuid', nullable: true })
  linkedCashBankAccountId?: string;

  // The expense_entries.category / income_entries.category string this account rolls up,
  // when sourceType is EXPENSE_CATEGORY_LINKED / INCOME_CATEGORY_LINKED.
  @Column({ type: 'varchar', nullable: true })
  categoryKey?: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
