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

  // ─── Online (card) payment snapshot ─────────────────────────────────────────
  // Mirrored from the approved SalePaymentRequest so the settlement/reporting side can
  // read card facts without joining back, exactly as it already does for amount and
  // paymentMode. No PAN, no CVV — last four only.

  @Column({ name: 'card_type', type: 'varchar', nullable: true })
  cardType?: string;

  @Column({ name: 'card_network', type: 'varchar', nullable: true })
  cardNetwork?: string;

  @Column({ name: 'issuer_country', type: 'varchar', length: 2, nullable: true })
  issuerCountry?: string;

  @Column({ name: 'issuer_bank', type: 'varchar', nullable: true })
  issuerBank?: string;

  @Column({ name: 'card_last4', type: 'varchar', length: 4, nullable: true })
  cardLast4?: string;

  @Column({ name: 'card_holder_name', type: 'varchar', nullable: true })
  cardHolderName?: string;

  @Column({ name: 'transaction_reference', type: 'varchar', nullable: true })
  transactionReference?: string;

  @Column({
    name: 'commission_rate_applied',
    type: 'decimal',
    precision: 6,
    scale: 4,
    nullable: true,
  })
  commissionRateApplied?: number;

  @Column({ name: 'commission_amount', type: 'decimal', precision: 12, scale: 3, nullable: true })
  commissionAmount?: number;

  /** amount − commissionAmount: what the acquirer actually deposits. */
  @Column({
    name: 'net_settlement_amount',
    type: 'decimal',
    precision: 12,
    scale: 3,
    nullable: true,
  })
  netSettlementAmount?: number;

  @Column({ name: 'commission_rule_id', type: 'uuid', nullable: true })
  commissionRuleId?: string;
}
