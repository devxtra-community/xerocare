import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Invoice } from './invoiceEntity';

export enum ReportedBy {
  CUSTOMER = 'CUSTOMER',
  EMPLOYEE = 'EMPLOYEE',
}

@Entity('usage_records')
export class UsageRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  contractId!: string;

  @ManyToOne(() => Invoice)
  @JoinColumn({ name: 'contractId' })
  contract!: Invoice;

  @Column({ type: 'date' })
  billingPeriodStart!: Date;

  @Column({ type: 'date' })
  billingPeriodEnd!: Date;

  // Raw Readings (A4/A3 Separation)
  @Column({ type: 'int', default: 0 })
  bwA4Count!: number;

  @Column({ type: 'int', default: 0 })
  bwA3Count!: number;

  @Column({ type: 'int', default: 0 })
  colorA4Count!: number;

  @Column({ type: 'int', default: 0 })
  colorA3Count!: number;

  @Column({
    type: 'enum',
    enum: ReportedBy,
  })
  reportedBy!: ReportedBy;

  @Column({ type: 'uuid', nullable: true })
  recordedByEmployeeId?: string;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  // Meter Reading Image (R2)
  @Column({ type: 'text', nullable: true })
  meterImageUrl?: string;

  // Finance Approval
  @Column({ type: 'boolean', default: false })
  approvedByFinance!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'text', nullable: true })
  financeRemarks?: string;

  // Locking mechanism: specific usage record tied to a final invoice
  @Column({ type: 'uuid', nullable: true })
  finalInvoiceId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
