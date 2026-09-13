import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ServiceTicket } from './serviceTicketEntity';
import { ServiceEstimateItem } from './serviceEstimateItemEntity';

export enum ServiceEstimateStatus {
  DRAFT = 'DRAFT',
  WAITING_FINANCE_APPROVAL = 'WAITING_FINANCE_APPROVAL',
  FINANCE_APPROVED = 'FINANCE_APPROVED',
  CUSTOMER_APPROVED = 'CUSTOMER_APPROVED',
  REJECTED = 'REJECTED',
  WAITING_ADDITIONAL_APPROVAL = 'WAITING_ADDITIONAL_APPROVAL',
}

@Entity('service_estimates')
export class ServiceEstimate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  ticketId!: string;

  @ManyToOne(() => ServiceTicket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket!: ServiceTicket;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  labourCost!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCost!: number;

  @Column({ name: 'parts_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  partsCost!: number;

  @Column({ name: 'visit_charge_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  visitChargeAmount!: number;

  @Column({ name: 'transport_charge_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  transportChargeAmount!: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount!: number;

  @Column({
    type: 'varchar',
    default: ServiceEstimateStatus.DRAFT,
  })
  status!: ServiceEstimateStatus;

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @Column({ name: 'currency_code', type: 'varchar', length: 3, nullable: true })
  currencyCode?: string;

  @Column({
    name: 'exchange_rate_snapshot',
    type: 'decimal',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  exchangeRateSnapshot?: number;

  // --- Customer remote-approval link (mirrors UsageRecord's bill signing token) ---
  // The single-use 72-hour token IS the credential for the public approval page.
  @Column({ name: 'signing_token', type: 'varchar', nullable: true })
  signingToken?: string | null;

  @Column({ name: 'signing_token_expires_at', type: 'timestamp', nullable: true })
  signingTokenExpiresAt?: Date | null;

  @Column({ name: 'signing_token_used', type: 'boolean', default: false })
  signingTokenUsed!: boolean;

  @Column({ name: 'estimate_sent_at', type: 'timestamp', nullable: true })
  estimateSentAt?: Date | null;

  // How the customer's decision was captured:
  // REMOTE_LINK (customer clicked the emailed link) | IN_PERSON | PHONE | WHATSAPP
  // | EMAIL (staff relaying a decision the customer made off-system) | FINANCE_MANUAL
  @Column({ name: 'customer_approval_method', type: 'varchar', nullable: true })
  customerApprovalMethod?: string | null;

  // Free-text note the staff member adds when recording an off-system decision
  // ("Confirmed with Mr. Rahul by phone at 3:15pm").
  @Column({ name: 'customer_decision_note', type: 'text', nullable: true })
  customerDecisionNote?: string | null;

  @Column({ name: 'customer_approved_by_name', type: 'varchar', nullable: true })
  customerApprovedByName?: string | null;

  @Column({ name: 'customer_approved_at', type: 'timestamp', nullable: true })
  customerApprovedAt?: Date | null;

  @Column({ name: 'customer_rejection_reason', type: 'text', nullable: true })
  customerRejectionReason?: string | null;

  @Column({ name: 'customer_rejected_at', type: 'timestamp', nullable: true })
  customerRejectedAt?: Date | null;

  // Proof of the customer's approval — required for every staff-recorded decision
  // (method !== REMOTE_LINK). Exactly one of the two is set: a live-drawn
  // signature, or an uploaded photo/PDF of a physically-signed copy (with its
  // required attestation note). Mirrors ContractAgreement's own signature columns.
  @Column({ name: 'customer_signature_data', type: 'text', nullable: true })
  customerSignatureData?: string | null;

  @Column({ name: 'customer_signed_document_url', type: 'varchar', length: 500, nullable: true })
  customerSignedDocumentUrl?: string | null;

  @Column({ name: 'customer_signed_document_note', type: 'text', nullable: true })
  customerSignedDocumentNote?: string | null;

  @OneToMany(() => ServiceEstimateItem, (item) => item.estimate, { cascade: true })
  items!: ServiceEstimateItem[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
