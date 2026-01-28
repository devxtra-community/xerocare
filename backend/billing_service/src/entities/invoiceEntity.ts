import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { InvoiceItem } from './invoiceItemEntity';
import { InvoiceStatus } from './enums/invoiceStatus';
import { SaleType } from './enums/saleType';
import { InvoiceType } from './enums/invoiceType';
import { RentType } from './enums/rentType';
import { RentPeriod } from './enums/rentPeriod';
import { LeaseType } from './enums/leaseType';

export enum SecurityDepositMode {
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  invoiceNumber!: string;

  // Security Deposit (Phase 4)
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  securityDepositAmount?: number;

  @Column({
    type: 'enum',
    enum: SecurityDepositMode,
    nullable: true,
  })
  securityDepositMode?: SecurityDepositMode;

  @Column({ type: 'varchar', nullable: true })
  securityDepositReference?: string;

  @Column({ type: 'date', nullable: true })
  securityDepositReceivedDate?: Date;

  @Column()
  branchId!: string;

  @Column()
  createdBy!: string; // employeeId

  @Column()
  customerId!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalAmount!: number;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status!: InvoiceStatus;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, {
    cascade: true,
  })
  items!: InvoiceItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({
    type: 'enum',
    enum: SaleType,
  })
  saleType!: SaleType;

  // --- Quotation / Quotation Fields ---

  @Column({
    type: 'enum',
    enum: InvoiceType,
    default: InvoiceType.QUOTATION,
  })
  type!: InvoiceType;

  @Column({
    type: 'enum',
    enum: RentType,
    nullable: true,
  })
  rentType!: RentType;

  @Column({
    type: 'enum',
    enum: RentPeriod,
    nullable: true,
  })
  rentPeriod!: RentPeriod;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monthlyRent?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  advanceAmount?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  discountPercent?: number;

  @Column({ type: 'date', nullable: true })
  effectiveFrom!: Date;

  @Column({ type: 'date', nullable: true })
  effectiveTo?: Date;

  @Column({ type: 'int', nullable: true })
  billingCycleInDays?: number;

  // --- Lease Fields ---
  @Column({
    type: 'enum',
    enum: LeaseType,
    nullable: true,
  })
  leaseType!: LeaseType;

  @Column({ type: 'int', nullable: true })
  leaseTenureMonths?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalLeaseAmount?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monthlyEmiAmount?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monthlyLeaseAmount?: number;

  // --- Final Invoice Fields ---

  @Column({ nullable: true })
  referenceContractId?: string; // Link to PROFORMA contract

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  grossAmount?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  discountAmount?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  advanceAdjusted?: number;
}
