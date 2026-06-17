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
import { ServiceEstimate } from './serviceEstimateEntity';
import { ServiceTicket } from './serviceTicketEntity';
import { ServiceEstimateItem } from './serviceEstimateItemEntity';

@Entity('service_estimate_revisions')
export class ServiceEstimateRevision {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'invoice_id', nullable: true })
  invoiceId!: string | null; // The service quotation invoice

  @Column({ type: 'uuid', nullable: true })
  estimateId!: string | null;

  @ManyToOne(() => ServiceEstimate, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'estimateId' })
  estimate!: ServiceEstimate | null;

  @Column({ type: 'uuid' })
  ticketId!: string;

  @ManyToOne(() => ServiceTicket, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'ticketId' })
  ticket!: ServiceTicket | null;

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @Column({ type: 'int', name: 'revision_number', default: 1 })
  revisionNumber!: number; // 1, 2, 3...

  @Column({ type: 'varchar', name: 'revision_type', nullable: true })
  revisionType!: 'INITIAL' | 'DISCOUNT' | 'VALIDITY_EXTENSION' | 'DISCOUNT_AND_VALIDITY' | null;

  @Column({ type: 'jsonb', name: 'items_snapshot', nullable: true })
  itemsSnapshot!: object | null; // Full snapshot of items at time of revision

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  labourCost!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCost!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_amount' })
  totalAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'discount_applied' })
  discountApplied!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'visit_charge_amount' })
  visitChargeAmount!: number;

  @Column({ type: 'text', nullable: true, name: 'technician_note_to_finance' })
  technicianNoteToFinance!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'submitted_by' })
  submittedBy!: string | null; // Technician employee ID

  @Column({ type: 'varchar', default: 'DRAFT' })
  status!: string; // 'DRAFT', 'WAITING_ADDITIONAL_APPROVAL', 'APPROVED', 'REJECTED'

  @Column({ type: 'varchar', nullable: true, name: 'finance_decision' })
  financeDecision!: 'APPROVED' | 'REJECTED' | null;

  @Column({ type: 'varchar', nullable: true, name: 'finance_decision_by' })
  financeDecisionBy!: string | null;

  @Column({ type: 'text', nullable: true, name: 'finance_decision_note' })
  financeDecisionNote!: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'finance_decision_at' })
  financeDecisionAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'valid_until' })
  validUntil!: Date | null;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @OneToMany(() => ServiceEstimateItem, (item) => item.revision, { cascade: true })
  items!: ServiceEstimateItem[];

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
