import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { Lot } from './lotEntity';
import { Vendor } from './vendorEntity';
import { Branch } from './branchEntity';
import { PurchasePayment } from './purchasePaymentEntity';
import { PurchaseCost } from './purchaseCostEntity';
import { PurchaseOrigin } from './enums/purchaseOrigin';

@Entity('purchases')
export class Purchase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'lot_id', type: 'uuid', unique: true })
  lotId!: string;

  @OneToOne(() => Lot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lot_id' })
  lot!: Lot;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor!: Vendor;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch;

  @Column({ name: 'purchase_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  purchaseAmount!: number;

  @Column({ name: 'documentation_fee', type: 'decimal', precision: 12, scale: 2, default: 0 })
  documentationFee!: number;

  @Column({ name: 'labour_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  labourCost!: number;

  @Column({ name: 'handling_fee', type: 'decimal', precision: 12, scale: 2, default: 0 })
  handlingFee!: number;

  @Column({ name: 'transportation_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  transportationCost!: number;

  @Column({ name: 'shipping_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  shippingCost!: number;

  @Column({ name: 'groundfield_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  groundfieldCost!: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount!: number;

  // Snapshot copied from the lot/RFQ at creation. Powers domestic vs international
  // spend reporting without re-joining vendor/branch country at query time.
  @Column({
    name: 'purchase_origin',
    type: 'enum',
    enum: PurchaseOrigin,
    nullable: true,
  })
  @Index()
  purchaseOrigin?: PurchaseOrigin;

  // ─── Vendor snapshot (copied at creation, never recalculated) ────────────────
  @Column({ name: 'vendor_vat_number', type: 'varchar', length: 50, nullable: true })
  vendorVatNumber?: string | null;

  @Column({ name: 'vendor_country', type: 'varchar', length: 2, nullable: true })
  vendorCountry?: string | null;

  @Column({ name: 'vendor_state_province', type: 'varchar', length: 100, nullable: true })
  vendorStateProvince?: string | null;

  @Column({ name: 'vendor_city', type: 'varchar', length: 100, nullable: true })
  vendorCity?: string | null;

  // ─── Currency (inherited from lot at creation) ────────────────────────────
  @Column({ name: 'currency_code', type: 'varchar', length: 3, nullable: true })
  currencyCode?: string | null;

  @Column({ name: 'exchange_rate', type: 'decimal', precision: 12, scale: 6, nullable: true })
  exchangeRate?: number | null;

  // ─── Purchase category ────────────────────────────────────────────────────
  @Column({
    name: 'purchase_category',
    type: 'enum',
    enum: ['PRODUCT', 'SPARE_PART', 'SERVICE', 'OTHER'],
    nullable: true,
  })
  purchaseCategory?: 'PRODUCT' | 'SPARE_PART' | 'SERVICE' | 'OTHER' | null;

  // ─── Tax fields ───────────────────────────────────────────────────────────
  // taxableAmount = purchaseAmount + labourCost + handlingFee + transportationCost
  //                 + shippingCost + groundfieldCost  (documentationFee excluded — it is
  //                 a non-taxable administrative charge in most Gulf jurisdictions)
  @Column({ name: 'taxable_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  taxableAmount?: number | null;

  @Column({ name: 'tax_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  taxPercent?: number | null;

  @Column({ name: 'tax_name', type: 'varchar', length: 50, nullable: true })
  taxName?: string | null;

  // For DOMESTIC purchases: actual input VAT paid to local vendor (reclaimable)
  @Column({ name: 'input_vat_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  inputVatAmount?: number | null;

  // For INTERNATIONAL purchases only: self-assessed reverse-charge/import VAT
  @Column({
    name: 'reverse_charge_vat_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  reverseChargeVatAmount?: number | null;

  // ─── International purchase fields ────────────────────────────────────────
  @Column({ name: 'import_invoice_no', type: 'varchar', length: 100, nullable: true })
  importInvoiceNo?: string | null;

  @Column({ name: 'customs_entry_no', type: 'varchar', length: 100, nullable: true })
  customsEntryNo?: string | null;

  @Column({ name: 'customs_duty', type: 'decimal', precision: 12, scale: 2, nullable: true })
  customsDuty?: number | null;

  @Column({
    name: 'goods_or_service',
    type: 'enum',
    enum: ['GOODS', 'SERVICE'],
    nullable: true,
  })
  goodsOrService?: 'GOODS' | 'SERVICE' | null;

  @Column({ name: 'vat_claimable', type: 'boolean', default: true })
  vatClaimable!: boolean;

  @Column({
    name: 'tax_status',
    type: 'enum',
    enum: ['PENDING', 'RECORDED', 'FILED'],
    default: 'PENDING',
  })
  taxStatus!: 'PENDING' | 'RECORDED' | 'FILED';

  // ─── ─────────────────────────────────────────────────────────────────────
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => PurchasePayment, (payment) => payment.purchase)
  payments!: PurchasePayment[];

  @OneToMany(() => PurchaseCost, (cost) => cost.purchase)
  costs!: PurchaseCost[];
}
