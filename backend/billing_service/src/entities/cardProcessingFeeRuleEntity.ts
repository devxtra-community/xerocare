import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * A merchant's card processing fee (MDR) agreement, as configuration — never as a
 * hard-coded constant.
 *
 * There is no universal "Visa = 2%" or "UAE = 2.9%". What a merchant actually pays
 * depends on the acquirer, the gateway, the network, debit vs credit, the merchant
 * category and the negotiated agreement — and several Gulf regulators publish caps
 * (SAMA's Mada e-commerce ceiling, Qatar's regulated debit limits) that apply on top.
 * Encoding any published figure as a system default would silently bill every merchant
 * someone else's rate, so rates live here and an unmatched transaction is refused
 * rather than quietly charged 0%.
 *
 * Rules are matched most-specific-first via `priority`; see cardProcessingFeeService.
 */

export enum CardType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum CardNetwork {
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
  AMEX = 'AMEX',
  UNIONPAY = 'UNIONPAY',
  MADA = 'MADA',
  KNET = 'KNET',
  OTHER = 'OTHER',
}

/** ISO-3166 alpha-2 for the six GCC states this system operates in. */
export enum IssuerCountry {
  AE = 'AE',
  SA = 'SA',
  QA = 'QA',
  KW = 'KW',
  OM = 'OM',
  BH = 'BH',
}

@Entity('card_processing_fee_rules')
export class CardProcessingFeeRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Scopes a rule to one branch; null means it applies across the merchant. */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId?: string;

  @Index()
  @Column({ type: 'varchar', length: 2 })
  issuerCountry!: string;

  /** null = applies to every bank in the country. */
  @Column({ type: 'varchar', nullable: true })
  issuerBank?: string;

  /** null = applies to both debit and credit. */
  @Column({ type: 'varchar', nullable: true })
  cardType?: string;

  /** null = applies to every network. */
  @Column({ type: 'varchar', nullable: true })
  cardNetwork?: string;

  /** Acquirer / gateway this agreement is with, when the merchant has more than one. */
  @Column({ type: 'varchar', nullable: true })
  paymentGateway?: string;

  /** ECOM | POS | MOTO — the channel the rate was agreed for. */
  @Column({ type: 'varchar', nullable: true })
  transactionChannel?: string;

  @Column({ type: 'decimal', precision: 6, scale: 4, default: 0 })
  ratePercent!: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  fixedFee!: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
  minimumFee?: number;

  /** Regulatory or negotiated ceiling, e.g. a per-transaction cap on debit. */
  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
  maximumFee?: number;

  /** The rule only applies to transactions in this currency. */
  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @Column({ type: 'date' })
  effectiveFrom!: string;

  /** null = open-ended. */
  @Column({ type: 'date', nullable: true })
  effectiveTo?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * Higher wins when several rules match. Lets a bank-specific agreement override the
   * country-wide default without deleting the default.
   */
  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  /**
   * Bumped on every edit. Stored on the transaction alongside the rule id so a receipt
   * issued today still shows the rate that was actually charged, even after the
   * agreement is renegotiated tomorrow.
   */
  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
