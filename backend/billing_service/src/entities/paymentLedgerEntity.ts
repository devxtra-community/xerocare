import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Invoice } from './invoiceEntity';

export enum PaymentMode {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  CREDIT_CARD = 'CREDIT_CARD',
}

@Entity('payment_ledgers')
export class PaymentLedger {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Invoice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice!: Invoice;

  @Column()
  invoiceId!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amountPaid!: number;

  @Column({ type: 'enum', enum: PaymentMode })
  paymentMode!: PaymentMode;

  @Column({ type: 'date' })
  paymentDate!: Date;

  @Column({ type: 'varchar', nullable: true })
  referenceNumber?: string; // Cheque number, TXN ID, etc.

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @Column()
  recordedBy!: string; // employeeId

  @CreateDateColumn()
  createdAt!: Date;
}
