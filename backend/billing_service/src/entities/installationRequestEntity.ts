import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('installation_requests')
export class InstallationRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  invoiceId!: string;

  @Index()
  @Column({ type: 'uuid' })
  branchId!: string;

  // Who created the request (Help Desk / Employee)
  @Column({ type: 'uuid' })
  assignedByEmployeeId!: string;

  @Column({ type: 'varchar' })
  assignedByEmployeeName!: string;

  // Technician assigned to handle installation
  @Column({ type: 'uuid', nullable: true })
  technicianId?: string;

  @Column({ type: 'varchar', nullable: true })
  technicianName?: string;

  // Customer info snapshot
  @Column({ type: 'varchar' })
  customerName!: string;

  @Column({ type: 'varchar', nullable: true })
  customerAddress?: string;

  // Product/invoice summary
  @Column({ type: 'varchar' })
  invoiceNumber!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Time tracking
  @Column({ type: 'timestamp', nullable: true })
  startTime?: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime?: Date;

  @Column({ type: 'int', nullable: true })
  durationSeconds?: number; // endTime - startTime in seconds

  // Sale type snapshot — RENT/LEASE jobs need Initial Reading at Stop Installation
  @Column({ type: 'varchar', nullable: true })
  saleType?: string;

  // Status: PENDING | ASSIGNED | IN_PROGRESS | COMPLETED
  @Column({ type: 'varchar', default: 'PENDING' })
  status!: string;

  // Initial Reading audit trail (entered by Technician at Stop Installation for RENT/LEASE)
  @Column({ type: 'timestamp', nullable: true })
  initialReadingEnteredAt?: Date;

  @Column({ type: 'varchar', nullable: true })
  initialReadingEnteredByName?: string;

  @Column({ type: 'varchar', nullable: true })
  initialReadingPhotoUrl?: string;

  @Column({ type: 'date', nullable: true })
  initialReadingTakenDate?: Date;

  // ─── Installation report & customer sign-off ────────────────────────────────
  // The report is generated on demand from live data, so nothing about its *content*
  // is stored here — only the handover facts: that the customer saw it, who signed,
  // and the signature itself.

  /** Stamped the first time the report is opened, purely as an audit breadcrumb. */
  @Column({ type: 'timestamp', nullable: true })
  reportGeneratedAt?: Date;

  /** Single-use, 72-hour token backing the public signing link. */
  @Column({ type: 'varchar', nullable: true })
  signingToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  signingTokenExpiresAt?: Date;

  @Column({ type: 'boolean', default: false })
  signingTokenUsed!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  customerSignedAt?: Date;

  /** Printed name of whoever signed — may be an authorised representative, not the
   *  contract's customerName, so it is captured separately rather than assumed. */
  @Column({ type: 'varchar', nullable: true })
  customerSignatureName?: string;

  /** base64 PNG data URI, same convention as contractAgreementEntity's signatures. */
  @Column({ type: 'text', nullable: true })
  customerSignatureData?: string;

  @Column({ type: 'text', nullable: true })
  customerSignatureNote?: string;

  /** 'IN_PERSON' (technician's device at handover) or 'REMOTE_LINK'. */
  @Column({ type: 'varchar', nullable: true })
  customerSignatureMethod?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
