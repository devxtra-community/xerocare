import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Invoice } from './invoiceEntity';

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'invoice_id', type: 'uuid' })
  invoiceId!: string;

  @ManyToOne(() => Invoice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice!: Invoice;

  @Column({ name: 'transaction_date', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  transactionDate!: Date;

  @Column({ name: 'payment_mode', type: 'varchar', length: 50 })
  paymentMode!: string; // CASH, CARD, BANK_TRANSFER, CHEQUE, ONLINE

  @Column({ name: 'reference_number', type: 'varchar', length: 100, nullable: true })
  referenceNumber?: string;

  @Column({
    name: 'amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  amount!: number;

  @Column({ name: 'recorded_by', type: 'uuid', nullable: true })
  recordedBy?: string; // Employee ID

  @Column({ name: 'remarks', type: 'text', nullable: true })
  remarks?: string;

  @Column({ name: 'currency_code', type: 'varchar', length: 3, nullable: true })
  currencyCode?: string;

  /** Rate to convert currencyCode -> the invoice's own currency, captured at
   * payment time (historical accuracy — same convention as
   * Invoice.exchangeRateSnapshot / Purchase.exchangeRate). Null when
   * currencyCode matches the invoice currency (no conversion needed). */
  @Column({
    name: 'exchange_rate_snapshot',
    type: 'decimal',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  exchangeRateSnapshot?: number;

  @Column({ name: 'receipt_url', type: 'varchar', nullable: true })
  receiptUrl?: string; // Proof of payment (screenshot/PDF) uploaded to R2

  // Set on the ORIGINAL transaction when a cheque backing it later bounces/is
  // cancelled — the correction itself is a separate offsetting transaction (see
  // reversedById), same convention as CashbookEntry.isReversed/reversedById. Guards
  // against double-reversal and lets a payment list label the original distinctly.
  @Column({ name: 'is_reversed', type: 'boolean', default: false })
  isReversed!: boolean;

  /** True when this receipt is refundable security-deposit money rather than payment
   * against what the customer owes. The deposit is never part of the invoice's
   * receivable (SECURITY_DEPOSIT bills are excluded from the billed side, and
   * approveSalePayment keeps deposits out of InvoiceLedger entirely), so counting its
   * receipt as "paid" understated every affected contract's outstanding balance by the
   * deposit amount. Every outstanding/AR query filters on this; the row itself still
   * exists as the deposit's auditable receipt and still posts to the cashbook. */
  @Column({ name: 'is_security_deposit', type: 'boolean', default: false })
  isSecurityDeposit!: boolean;

  @Column({ name: 'reversed_by_id', type: 'uuid', nullable: true })
  reversedById?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
