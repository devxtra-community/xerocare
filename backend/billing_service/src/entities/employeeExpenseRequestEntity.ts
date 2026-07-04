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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
