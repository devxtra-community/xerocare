import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ServiceContractType {
  FSMA = 'FSMA',
  SMA = 'SMA',
  AMC = 'AMC',
}

export enum FsmaBillingMode {
  /** Separate per-click rates for B&W and colour meters. */
  INDIVIDUAL = 'INDIVIDUAL',
  /** One rate applied to the total meter. */
  COMBINED = 'COMBINED',
}

@Entity('service_contracts')
export class ServiceContract {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  productId!: string;

  @Column({ type: 'uuid' })
  customerId!: string;

  @Column({
    type: 'enum',
    enum: ServiceContractType,
    enumName: 'service_contracts_contracttype_enum',
  })
  contractType!: ServiceContractType;

  @Column({ type: 'timestamp' })
  startDate!: Date;

  @Column({ type: 'timestamp' })
  endDate!: Date;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  contractValue!: number;

  // Coverage is derived from contractType server-side; kept as a column so
  // billing snapshots stay correct if type rules ever change.
  @Column({ type: 'jsonb', nullable: true })
  coverageRules!: {
    labour: boolean;
    spareParts: boolean;
    toner: boolean;
    travel: boolean;
    [key: string]: boolean;
  };

  // ── AMC ──────────────────────────────────────────────────────────────
  /** Fixed fee collected every month (labour free, parts+toner chargeable). */
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  monthlyCharge!: number | null;

  // ── SMA ──────────────────────────────────────────────────────────────
  /** Copies included in the contract; whichever of endDate/copyLimit hits first. */
  @Column({ type: 'integer', nullable: true })
  copyLimit!: number | null;

  /** Per-copy rate charged once usage exceeds copyLimit. */
  @Column({ type: 'numeric', precision: 12, scale: 4, nullable: true })
  overagePerCopyRate!: number | null;

  // ── SMA + FSMA(COMBINED) baseline ────────────────────────────────────
  /** Machine total meter reading captured at contract signing. */
  @Column({ type: 'integer', nullable: true })
  startMeterReading!: number | null;

  // ── FSMA ─────────────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 20, nullable: true })
  fsmaBillingMode!: FsmaBillingMode | null;

  @Column({ type: 'numeric', precision: 12, scale: 4, nullable: true })
  ratePerClickBW!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 4, nullable: true })
  ratePerClickColor!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 4, nullable: true })
  ratePerClickCombined!: number | null;

  @Column({ type: 'integer', nullable: true })
  startMeterBW!: number | null;

  @Column({ type: 'integer', nullable: true })
  startMeterColor!: number | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
