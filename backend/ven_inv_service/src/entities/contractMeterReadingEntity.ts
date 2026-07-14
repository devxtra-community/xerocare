import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * One meter reading collected against a service contract (typically monthly).
 * The billing amount is computed server-side at record time from the
 * contract's rates and stored immutably here, together with the click deltas
 * since the previous reading (or the contract's start meters for the first
 * reading).
 */
@Entity('contract_meter_readings')
export class ContractMeterReading {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  contractId!: string;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  readingDate!: Date;

  /** Lifetime total meter (SMA, FSMA COMBINED; auto-summed for INDIVIDUAL). */
  @Column({ type: 'integer', nullable: true })
  totalReading!: number | null;

  /** FSMA INDIVIDUAL mode meters. */
  @Column({ type: 'integer', nullable: true })
  bwReading!: number | null;

  @Column({ type: 'integer', nullable: true })
  colorReading!: number | null;

  /** Clicks consumed since the previous reading. */
  @Column({ type: 'integer', default: 0 })
  clicksTotal!: number;

  @Column({ type: 'integer', default: 0 })
  clicksBW!: number;

  @Column({ type: 'integer', default: 0 })
  clicksColor!: number;

  /** Amount to collect for this period, computed from contract rates. */
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  amountCharged!: number;

  /** How amountCharged was derived (rates, overage clicks, mode, …). */
  @Column({ type: 'jsonb', nullable: true })
  chargeBreakdown!: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'uuid', nullable: true })
  recordedBy!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
