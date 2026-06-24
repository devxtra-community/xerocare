import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ServiceTicketItem } from './serviceTicketItemEntity';

export enum ServiceTicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  DIAGNOSED = 'DIAGNOSED',
  QUOTED = 'QUOTED',
  WAITING_FINANCE_APPROVAL = 'WAITING_FINANCE_APPROVAL',
  FINANCE_APPROVED = 'FINANCE_APPROVED',
  FINANCE_REJECTED = 'FINANCE_REJECTED',
  CUSTOMER_APPROVED = 'CUSTOMER_APPROVED',
  CUSTOMER_REJECTED = 'CUSTOMER_REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FREE_SERVICE = 'FREE_SERVICE',
  ESTIMATE_RECORDED = 'ESTIMATE_RECORDED',
  ADDITIONAL_ESTIMATE_PENDING = 'ADDITIONAL_ESTIMATE_PENDING',
  WAITING_FINANCE_APPROVAL_2 = 'WAITING_FINANCE_APPROVAL_2',
  FINANCE_APPROVED_2 = 'FINANCE_APPROVED_2',
}

export enum ServiceContext {
  RENT = 'RENT',
  WARRANTY = 'WARRANTY',
  LEASE_UNDER_WARRANTY = 'LEASE_UNDER_WARRANTY',
  FSMA = 'FSMA',
  SMA = 'SMA',
  AMC = 'AMC',
  CHARGEABLE = 'CHARGEABLE',
  LEASE_EXPIRED = 'LEASE_EXPIRED',
  EXTERNAL_MACHINE = 'EXTERNAL_MACHINE',
}

export enum JobType {
  ONSITE = 'ONSITE',
  BRING_TO_CENTRE = 'BRING_TO_CENTRE',
  WARRANTY_ONSITE = 'WARRANTY_ONSITE',
}

@Entity('service_tickets')
export class ServiceTicket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  ticketNumber!: string;

  @Column({ type: 'uuid', nullable: true })
  customerId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  leadId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  productId?: string | null;

  @Column()
  productBrand!: string;

  @Column()
  productModel!: string;

  @Column()
  productName!: string;

  @Column()
  serialNumber!: string;

  @Column({
    type: 'enum',
    enum: ServiceContext,
  })
  serviceContext!: ServiceContext;

  @Column({ type: 'uuid', nullable: true })
  contractReferenceId?: string | null;

  @Column({ type: 'text' })
  issueDescription!: string;

  @Column({
    type: 'enum',
    enum: JobType,
  })
  jobType!: JobType;

  @Column({
    type: 'enum',
    enum: ServiceTicketStatus,
    default: ServiceTicketStatus.OPEN,
  })
  status!: ServiceTicketStatus;

  @Column({ type: 'uuid', nullable: true })
  assignedTechnicianId?: string | null;

  @Column({ type: 'uuid' })
  createdBy!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @Column({ type: 'uuid', nullable: true })
  serviceQuotationId?: string | null;

  @Column({ type: 'text', nullable: true })
  diagnosisNotes?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  scheduledVisitDate?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  diagnosisStartedAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  diagnosisCompletedAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'repair_started_at' })
  repairStartedAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  repairCompletedAt?: Date | null;

  @Column({ type: 'integer', nullable: true })
  diagnosisDuration?: number | null; // in minutes

  @Column({ type: 'integer', nullable: true })
  repairDuration?: number | null; // in minutes

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  completionNotes?: string | null;

  // New fields
  @Column({ type: 'varchar', default: 'COMPLAINT', name: 'ticket_type' })
  ticketType!: 'COMPLAINT' | 'PREVENTATIVE_MAINTENANCE';

  @Column({ type: 'varchar', name: 'track' })
  track!: 'A' | 'B'; // Auto-set from serviceContext

  @Column({ type: 'boolean', default: false, name: 'estimate_sent_to_finance' })
  estimateSentToFinance!: boolean; // Track A: record only, no approval needed

  @Column({ type: 'text', nullable: true, name: 'problem_found' })
  problemFound?: string | null;

  @Column({ type: 'text', nullable: true, name: 'root_cause' })
  rootCause?: string | null;

  @Column({ type: 'text', nullable: true, name: 'work_performed' })
  workPerformed?: string | null;

  @Column({ type: 'text', nullable: true, name: 'resolution_details' })
  resolutionDetails?: string | null;

  @Column({ type: 'int', default: 0, name: 'additional_estimate_count' })
  additionalEstimateCount!: number; // How many re-estimates submitted in Track B

  @Column({ type: 'uuid', nullable: true, name: 'linked_invoice_id' })
  linkedInvoiceId?: string | null; // The original sale/rent/lease invoice this ticket belongs to

  @Column({ type: 'int', nullable: true, name: 'meter_reading_at_service' })
  meterReadingAtService?: number | null; // Total meter count at time of service visit

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'report_url' })
  reportUrl?: string | null;

  @OneToMany(() => ServiceTicketItem, (item) => item.ticket, { cascade: true })
  items!: ServiceTicketItem[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
