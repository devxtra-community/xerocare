import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cash_bank_accounts')
export class CashBankAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  type!: string; // CASH | BANK

  @Column({ type: 'varchar', nullable: true })
  bankName?: string;

  @Column({ type: 'varchar', nullable: true })
  accountNumber?: string;

  @Column({ type: 'varchar', nullable: true })
  iban?: string;

  @Column()
  branchId!: string;

  @Column({ length: 3, default: 'AED' })
  currency!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  openingBalance!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  currentBalance!: number;

  // CURRENT | SAVINGS | FIXED_DEPOSIT — for bank accounts
  @Column({ type: 'varchar', nullable: true, default: 'CURRENT' })
  accountType?: string;

  @Column({ type: 'date', nullable: true })
  openingDate?: Date;

  @Column({ type: 'uuid', nullable: true })
  responsiblePersonId?: string;

  @Column({ type: 'varchar', nullable: true })
  contactPerson?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
