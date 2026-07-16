import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('employee_expense_requests')
export class EmployeeExpenseRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  requestNo!: string;

  @Index()
  @Column({ type: 'uuid' })
  employeeId!: string;

  @Column()
  employeeName!: string;

  @Column()
  employeeRole!: string;

  @Index()
  @Column({ type: 'uuid' })
  branchId!: string;

  @Column()
  branchName!: string;

  @Column({ type: 'date' })
  date!: Date;

  @Column()
  category!: string;

  @Column({ type: 'varchar', nullable: true })
  subCategory?: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ length: 3, default: 'AED' })
  currency!: string;

  @Column({ type: 'varchar', nullable: true })
  receiptUrl?: string;

  @Index()
  @Column({ default: 'PENDING' })
  status!: string; // PENDING | SUBMITTED | APPROVED | REJECTED | PAID

  @Column({ type: 'timestamp', nullable: true })
  submittedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy?: string;

  @Column({ type: 'varchar', nullable: true })
  reviewedByName?: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  paidFromAccount?: string;

  @Column({ type: 'varchar', nullable: true })
  paymentReference?: string;

  @Column({ type: 'uuid', nullable: true })
  expenseEntryId?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Discriminator: 'EMPLOYEE_EXPENSE' (default) or 'MANAGER_PURCHASE'
  @Column({ type: 'varchar', default: 'EMPLOYEE_EXPENSE' })
  requestSource!: string;

  // MANAGER_PURCHASE fields — null for EMPLOYEE_EXPENSE requests
  @Column({ type: 'varchar', nullable: true })
  purchaseId?: string;

  @Column({ type: 'varchar', nullable: true })
  purchaseRef?: string;

  @Column({ type: 'varchar', nullable: true })
  vendorName?: string;

  // DOMESTIC (local) or INTERNATIONAL — snapshotted from the purchase at request time
  @Column({ type: 'varchar', nullable: true })
  purchaseOrigin?: string;

  // paymentMode selected by Manager (Cash / Bank Transfer / Cheque)
  @Column({ type: 'varchar', nullable: true })
  paymentMode?: string;

  // cash/bank account Manager selected to pay from
  @Column({ type: 'uuid', nullable: true })
  paidFromAccountId?: string;

  // ID of the PurchasePayment recorded in ven_inv at submission; voided on rejection
  @Column({ type: 'uuid', nullable: true })
  purchasePaymentId?: string;

  // cheque fields for Cheque-mode MANAGER_PURCHASE
  @Column({ type: 'varchar', nullable: true })
  chequeNumber?: string;

  @Column({ type: 'varchar', nullable: true })
  chequeBankName?: string;

  @Column({ type: 'date', nullable: true })
  chequeDueDate?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
