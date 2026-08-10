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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
