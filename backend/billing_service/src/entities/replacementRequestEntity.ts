import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * A machine-replacement request, carried from the moment an employee raises it through
 * to the customer signing off on the swap.
 *
 * This is the audit trail for the whole chain: every stage STAMPS its own fields rather
 * than overwriting an earlier stage's, so at any point the row answers "who did what,
 * when" for all seven stages.
 *
 * Deliberately separate from the swap itself. ProductAllocation records what machine is
 * on a contract right now; this records the human process that decided to change it. The
 * actual swap is one call to billingService.replaceDeviceAllocation(), made once, at the
 * technician-install stage — see ReplacementStatus.INSTALLED below.
 */

export enum ReplacementStatus {
  /** Employee raised it; sitting in Finance's queue. */
  PENDING_FINANCE = 'PENDING_FINANCE',
  /** Finance approved — the employee may now choose the replacement unit. */
  APPROVED = 'APPROVED',
  /** Finance declined; rejectionReason is set. Terminal, but a fresh request may be raised. */
  REJECTED = 'REJECTED',
  /** Employee picked the incoming unit. NOTHING has been swapped yet. */
  UNIT_SELECTED = 'UNIT_SELECTED',
  /** Service desk confirmed the unit physically reached the customer. */
  DELIVERED = 'DELIVERED',
  /** Service desk assigned the technician who will perform the swap. */
  TECHNICIAN_ASSIGNED = 'TECHNICIAN_ASSIGNED',
  /**
   * Technician recorded both meters and the swap committed. This is the ONLY status
   * whose transition also calls replaceDeviceAllocation() — the allocation swap sets the
   * billing boundary, so it must happen when the machine physically changes hands, not
   * when the unit was merely selected.
   */
  INSTALLED = 'INSTALLED',
  /** Customer signed off on the replacement report. Terminal. */
  CUSTOMER_APPROVED = 'CUSTOMER_APPROVED',
  /** Withdrawn before completion. Terminal. */
  CANCELLED = 'CANCELLED',
}

@Entity('replacement_requests')
export class ReplacementRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  requestNo!: string;

  // ─── Contract & outgoing machine ────────────────────────────────────────────
  @Index()
  @Column({ type: 'uuid' })
  contractId!: string;

  @Column({ type: 'varchar' })
  contractNumber!: string;

  @Index()
  @Column({ type: 'uuid' })
  branchId!: string;

  @Column({ type: 'uuid' })
  oldAllocationId!: string;

  @Column({ type: 'varchar' })
  oldSerialNumber!: string;

  @Column({ type: 'uuid', nullable: true })
  oldProductId?: string;

  /** Constrains the replacement search — a swap never changes the contracted model. */
  @Column({ type: 'varchar', nullable: true })
  modelId?: string;

  // ─── Customer snapshot (frozen at raise time) ───────────────────────────────
  @Column({ type: 'uuid', nullable: true })
  customerId?: string;

  @Column({ type: 'varchar' })
  customerName!: string;

  @Column({ type: 'varchar', nullable: true })
  customerEmail?: string;

  @Column({ type: 'varchar', nullable: true })
  customerPhone?: string;

  // ─── Stage 01 · raise ───────────────────────────────────────────────────────
  @Column({ type: 'varchar' })
  reason!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  /** R2 object keys for the fault evidence the employee uploaded. */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  proofPhotoUrls!: string[];

  @Column({ type: 'uuid' })
  raisedByEmployeeId!: string;

  @Column({ type: 'varchar' })
  raisedByEmployeeName!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  raisedAt!: Date;

  @Index()
  @Column({ type: 'varchar', default: ReplacementStatus.PENDING_FINANCE })
  status!: string;

  // ─── Stage 02 · finance decision ────────────────────────────────────────────
  @Column({ type: 'uuid', nullable: true })
  reviewedById?: string;

  @Column({ type: 'varchar', nullable: true })
  reviewedByName?: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  // ─── Stage 03 · employee selects the incoming unit ──────────────────────────
  @Column({ type: 'uuid', nullable: true })
  newProductId?: string;

  @Column({ type: 'varchar', nullable: true })
  newSerialNumber?: string;

  @Column({ type: 'timestamp', nullable: true })
  selectedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  selectedById?: string;

  @Column({ type: 'varchar', nullable: true })
  selectedByName?: string;

  // ─── Stage 04 · service desk delivery ───────────────────────────────────────
  @Column({ type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  deliveredById?: string;

  @Column({ type: 'varchar', nullable: true })
  deliveredByName?: string;

  // ─── Stage 05 · technician assignment ───────────────────────────────────────
  @Column({ type: 'uuid', nullable: true })
  technicianId?: string;

  @Column({ type: 'varchar', nullable: true })
  technicianName?: string;

  @Column({ type: 'timestamp', nullable: true })
  assignedAt?: Date;

  // ─── Stage 06 · technician install (the swap) ───────────────────────────────
  @Column({ type: 'int', nullable: true })
  oldMeterBwA4?: number;

  @Column({ type: 'int', nullable: true })
  oldMeterBwA3?: number;

  @Column({ type: 'int', nullable: true })
  oldMeterColorA4?: number;

  @Column({ type: 'int', nullable: true })
  oldMeterColorA3?: number;

  @Column({ type: 'int', nullable: true })
  newMeterBwA4?: number;

  @Column({ type: 'int', nullable: true })
  newMeterBwA3?: number;

  @Column({ type: 'int', nullable: true })
  newMeterColorA4?: number;

  @Column({ type: 'int', nullable: true })
  newMeterColorA3?: number;

  // ─── Stage 06 · time on the job ─────────────────────────────────────────────
  // How long the technician was actually on site swapping the machine: the clock
  // starts when they begin removing the old unit and stops when the new one is
  // installed (the install submit below). Deliberately separate from installedAt,
  // which is only the moment the record was written.

  @Column({ type: 'timestamp', nullable: true })
  workStartedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  workEndedAt?: Date;

  /** workEndedAt - workStartedAt, in seconds. Same shape as InstallationRequest's
   *  durationSeconds so both surfaces can share formatDuration(). */
  @Column({ type: 'int', nullable: true })
  workDurationSeconds?: number;

  /** The date the swap physically happened — drives the allocation boundary. */
  @Column({ type: 'date', nullable: true })
  installedOn?: string;

  @Column({ type: 'timestamp', nullable: true })
  installedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  installedById?: string;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  installPhotoUrls!: string[];

  /** Set from replaceDeviceAllocation()'s result — proves the swap actually committed. */
  @Column({ type: 'uuid', nullable: true })
  newAllocationId?: string;

  // ─── Stage 08 · Finance audit of the returned machine ───────────────────────
  // The unit that came off the contract is NOT sellable stock the moment the swap
  // happens — it comes back in unknown condition. It sits as RETURNED (off-contract,
  // awaiting audit) until Finance inspects the evidence and decides where it goes:
  //   MOVED_TO_STOCK → product becomes AVAILABLE and can be sold/allocated again
  //   MOVED_TO_GWR   → goods-warehouse-return; product becomes DAMAGED
  // PENDING is the state every completed replacement lands in.
  @Column({ type: 'varchar', default: 'PENDING' })
  dispositionStatus!: string; // PENDING | MOVED_TO_STOCK | MOVED_TO_GWR

  @Column({ type: 'text', nullable: true })
  dispositionNote?: string;

  @Column({ type: 'timestamp', nullable: true })
  dispositionAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  dispositionById?: string;

  @Column({ type: 'varchar', nullable: true })
  dispositionByName?: string;

  // ─── Stage 07 · report & customer approval ──────────────────────────────────
  @Column({ type: 'timestamp', nullable: true })
  reportSentAt?: Date;

  @Column({ type: 'varchar', nullable: true })
  reportChannel?: string;

  @Column({ type: 'varchar', nullable: true })
  signingToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  signingTokenExpiresAt?: Date;

  @Column({ type: 'boolean', default: false })
  signingTokenUsed!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  customerApprovedAt?: Date;

  @Column({ type: 'varchar', nullable: true })
  customerApprovalName?: string;

  @Column({ type: 'text', nullable: true })
  approvalNote?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
