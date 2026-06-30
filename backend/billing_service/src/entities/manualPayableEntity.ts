import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { PayablePayment } from './payablePaymentEntity';

@Entity('manual_payables')
export class ManualPayable {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  referenceNo!: string;

  @Column()
  type!: string; // VENDOR_INVOICE | SALARY_PAYABLE | RENT_PAYABLE | UTILITY_PAYABLE | OTHER

  @Column()
  payableTo!: string;

  @Column({ type: 'uuid', nullable: true })
  vendorId?: string;

  @Column({ type: 'uuid', nullable: true })
  employeeId?: string;

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
  status!: string; // PENDING | PARTIAL | PAID | OVERDUE

  @Column()
  branchId!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column()
  createdBy!: string;

  @OneToMany(() => PayablePayment, (p) => p.payable)
  payments?: PayablePayment[];

  @CreateDateColumn()
  createdAt!: Date;
}
