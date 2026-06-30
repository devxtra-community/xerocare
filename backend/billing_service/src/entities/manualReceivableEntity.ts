import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { ReceivablePayment } from './receivablePaymentEntity';

@Entity('manual_receivables')
export class ManualReceivable {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  referenceNo!: string;

  @Column()
  type!: string; // CUSTOMER_INVOICE | SECURITY_DEPOSIT | ADVANCE_PAYMENT | OTHER

  @Column({ type: 'uuid', nullable: true })
  customerId?: string;

  @Column({ type: 'varchar', nullable: true })
  customerName?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ length: 3, default: 'AED' })
  currency!: string;

  @Column({ type: 'date' })
  issueDate!: Date;

  @Column({ type: 'date' })
  dueDate!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amountPaid!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  outstanding?: number;

  @Column({ default: 'PENDING' })
  status!: string; // PENDING | PARTIAL | PAID | OVERDUE | WRITTEN_OFF

  @Column({ type: 'uuid', nullable: true })
  linkedInvoiceId?: string;

  @Column()
  branchId!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column()
  createdBy!: string;

  @OneToMany(() => ReceivablePayment, (p) => p.receivable)
  payments?: ReceivablePayment[];

  @CreateDateColumn()
  createdAt!: Date;
}
