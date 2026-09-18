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

  /**
   * Set when this request pays an additional purchase cost (Shipping, Labour,
   * Documentation, Transportation, Groundfield…) rather than the vendor's own invoice.
   *
   * The distinction decides where the money lands on approval: a vendor payment reduces
   * what the vendor is owed, while a cost is paid to a freight forwarder, a labourer or
   * a broker and must leave the vendor's outstanding untouched — settling the vendor's
   * invoice with money that never reached them would show the purchase as paid off while
   * the debt was still open. Null means an ordinary vendor payment.
   */
  @Column({ type: 'varchar', nullable: true })
  purchaseCostType?: string;

  /**
   * Set when this request settles a tax liability rather than paying a vendor.
   *
   * Input VAT is not money owed to the vendor — it is already inside their invoice and
   * is reclaimable from the tax authority. So a tax request must never take the vendor
   * payment path: approving it settles the tax record and leaves the vendor's own
   * outstanding untouched. `taxRecordId` is the discriminator and the audit link back to
   * the source row, which is what makes Tax → Request → Approval → Payables traceable.
   */
  @Column({ type: 'varchar', nullable: true })
  taxRecordId?: string;

  /** INPUT_VAT | REVERSE_CHARGE_VAT — which tax on that record is being settled. */
  @Column({ type: 'varchar', nullable: true })
  taxType?: string;

  @Column({ type: 'date', nullable: true })
  taxPeriodFrom?: Date;

  @Column({ type: 'date', nullable: true })
  taxPeriodTo?: Date;

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
