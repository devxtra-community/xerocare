import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { InvoiceItem } from './invoiceItemEntity';
import { InvoiceStatus } from './enums/invoiceStatus';
import { SaleType } from './enums/saleType';
import { InvoiceType } from './enums/invoiceType';
import { RentType } from './enums/rentType';
import { RentPeriod } from './enums/rentPeriod';
import { LeaseType } from './enums/leaseType';
import { ContractStatus } from './enums/contractStatus';
import { DeliveryStatus } from './enums/deliveryStatus';
import { ProductAllocation } from './productAllocationEntity';
import { BillType } from './enums/billType';
import { CreditNote } from './creditNoteEntity';
import { WarrantyType } from './enums/warrantyType';
import { WarrantyDurationUnit } from './enums/warrantyDurationUnit';

export enum SecurityDepositMode {
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD',
  UPI = 'UPI',
}

@Entity('invoices')
@Index(['contractStatus', 'type'], { where: "type = 'PROFORMA'" })
@Index(['templateId', 'assignedEmployeeId', 'customerId'], {
  unique: true,
  where:
    'status NOT IN (\'SUPERSEDED\', \'RETAKEN\') AND type = \'QUOTATION\' AND "templateId" IS NOT NULL AND "assignedEmployeeId" IS NOT NULL AND "customerId" IS NOT NULL',
})
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  invoiceNumber!: string;

  // Security Deposit (Phase 4)
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  securityDepositAmount?: number;

  @Column({
    type: 'enum',
    enum: SecurityDepositMode,
    nullable: true,
  })
  securityDepositMode?: SecurityDepositMode;

  @Column({ type: 'varchar', nullable: true })
  securityDepositReference?: string;

  @Column({ type: 'date', nullable: true })
  securityDepositDate?: Date;

  @Column({ type: 'varchar', nullable: true })
  securityDepositBank?: string;

  @Column({ type: 'date', nullable: true })
  securityDepositReceivedDate?: Date;

  @Column()
  branchId!: string;

  @Column()
  createdBy!: string; // employeeId

  @Column({ nullable: true })
  customerId?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalAmount!: number;

  @Column({
    type: 'varchar',
    default: InvoiceStatus.DRAFT,
  })
  status!: InvoiceStatus;

  @Column({
    name: 'contractStatus', // Explicitly map to DB column to handle case sensitivity
    type: 'enum',
    enum: ContractStatus,
    nullable: true,
  })
  contractStatus?: ContractStatus;

  @Column({ type: 'varchar', nullable: true })
  contractConfirmationUrl?: string;

  // Physical delivery of the machine to the customer's premises — gates the
  // Assign Technician action, which makes no sense before the machine arrives.
  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.NOT_DELIVERED,
  })
  deliveryStatus!: DeliveryStatus;

  // --- Audit Fields ---
  @Column({ nullable: true })
  employeeApprovedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  employeeApprovedAt?: Date;

  @Column({ nullable: true })
  financeApprovedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  financeApprovedAt?: Date;

  @Column({ type: 'text', nullable: true })
  financeRemarks?: string;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, {
    cascade: true,
  })
  items!: InvoiceItem[];

  @OneToMany(() => ProductAllocation, (allocation) => allocation.contract, {
    cascade: false,
  })
  productAllocations?: ProductAllocation[];

  @OneToMany(() => CreditNote, (cn) => cn.invoice)
  creditNotes?: CreditNote[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({
    type: 'enum',
    enum: SaleType,
  })
  saleType!: SaleType;

  @Column({ type: 'boolean', default: false })
  isDirectSale!: boolean;

  // --- Quotation / Quotation Fields ---

  @Column({
    type: 'enum',
    enum: InvoiceType,
    default: InvoiceType.QUOTATION,
  })
  type!: InvoiceType;

  @Column({
    type: 'enum',
    enum: RentType,
    nullable: true,
  })
  rentType!: RentType;

  @Column({
    type: 'enum',
    enum: RentPeriod,
    nullable: true,
  })
  rentPeriod!: RentPeriod;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monthlyRent?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  advanceAmount?: number;

  /**
   * Stable default payment mode for this contract's recurring billing — set once from
   * the first payment ever recorded (the advance) and never overwritten afterward, so
   * Finance overriding one period's mode doesn't change what later periods default to.
   * Used to pre-fill the usage-bill payment flow; Finance can still freely override it.
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  preferredPaymentMode?: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  preferredChequeBankName?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  discountPercent?: number;

  /** A3 page multiplier for effective click count in usage billing (e.g. 2
   *  clicks per A3 page). Contract-level so custom terms (1.5x, 2.5x, dedicated
   *  A3 meter) don't require a code change. */
  @Column({ name: 'a3_multiplier', type: 'decimal', precision: 4, scale: 2, default: 2.0 })
  a3Multiplier!: number;

  @Column({ type: 'date', nullable: true })
  effectiveFrom!: Date;

  @Column({ type: 'date', nullable: true })
  effectiveTo?: Date;

  @Column({ type: 'int', nullable: true })
  billingCycleInDays?: number;

  @Column({ type: 'date', nullable: true })
  billingPeriodStart?: Date;

  @Column({ type: 'date', nullable: true })
  billingPeriodEnd?: Date;

  // --- Delivery Status ---
  @Column({ type: 'timestamp', nullable: true })
  emailSentAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  whatsappSentAt?: Date;

  @Column({ type: 'boolean', default: false })
  isFinalMonth?: boolean;

  @Column({ type: 'boolean', default: false })
  isSummaryInvoice?: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  // --- Lease Fields ---
  @Column({
    type: 'enum',
    enum: LeaseType,
    nullable: true,
  })
  leaseType!: LeaseType;

  @Column({ type: 'int', nullable: true })
  leaseTenureMonths?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalLeaseAmount?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monthlyEmiAmount?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monthlyLeaseAmount?: number;

  // --- Final Invoice Fields ---

  @Column({ nullable: true })
  referenceContractId?: string; // Link to PROFORMA contract

  @Column({ nullable: true })
  usageRecordId?: string; // Link to Usage Record (for Monthly Invoice)

  // --- Currency (set at creation from branch, never updated) ---
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

  // --- Tax Snapshot (copied from branch at invoice creation, never recalculated) ---
  @Column({ name: 'tax_name', type: 'varchar', length: 50, nullable: true })
  taxName?: string;

  @Column({ name: 'tax_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  taxPercent?: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  taxAmount?: number;

  @Column({ name: 'tax_registration_number', type: 'varchar', length: 50, nullable: true })
  taxRegistrationNumber?: string;

  // --- Customer Snapshot (copied from CRM at invoice creation for tax reporting) ---
  @Column({ name: 'customer_name', type: 'varchar', length: 255, nullable: true })
  customerName?: string | null;

  @Column({ name: 'customer_vat_number', type: 'varchar', length: 50, nullable: true })
  customerVatNumber?: string | null;

  // Snapshot of the customer's CustomerVatStatus at the time this invoice was
  // created/customer-assigned — 'REGISTERED' | 'UNREGISTERED_STANDARD' | 'EXEMPT'.
  // Kept as a permanent snapshot (like customerVatNumber above) rather than a live
  // lookup so an invoice's own VAT-exempt reporting status can't retroactively
  // change if the customer's status is edited later. Used both for document
  // rendering ("VAT Exempt" label) and Output Tax report categorization.
  @Column({ name: 'customer_vat_status', type: 'varchar', length: 30, nullable: true })
  customerVatStatus?: string | null;

  @Column({ name: 'customer_country', type: 'varchar', length: 2, nullable: true })
  customerCountry?: string | null;

  @Column({ name: 'customer_state_province', type: 'varchar', length: 100, nullable: true })
  customerStateProvince?: string | null;

  @Column({ name: 'customer_city', type: 'varchar', length: 100, nullable: true })
  customerCity?: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  grossAmount?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  discountAmount?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  advanceAdjusted?: number;

  // --- Usage Snapshots ---
  @Column({ type: 'int', nullable: true })
  bwA4Count?: number;

  @Column({ type: 'int', nullable: true })
  bwA3Count?: number;

  @Column({ type: 'int', nullable: true })
  colorA4Count?: number;

  @Column({ type: 'int', nullable: true })
  colorA3Count?: number;

  @Column({ type: 'int', nullable: true })
  extraBwA4Count?: number;

  @Column({ type: 'int', nullable: true })
  extraColorA4Count?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  additionalCharges?: number;

  @Column({ type: 'text', nullable: true })
  additionalChargesRemarks?: string;

  @Column({ type: 'varchar', nullable: true })
  layoutId?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // --- Manager Template & Assignment System ---
  @Index()
  @Column({ type: 'boolean', default: false })
  isTemplate!: boolean;

  @Index()
  @Column({ name: 'is_opening_entry', type: 'boolean', default: false })
  isOpeningEntry!: boolean;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  templateId?: string | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  assignedEmployeeId?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscountAllowed?: number;

  @Column({ type: 'timestamp', nullable: true })
  assignedAt?: Date;

  @Column({ type: 'varchar', nullable: true })
  assignedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  retakenAt?: Date | null;

  @Column({ type: 'varchar', nullable: true })
  retakenBy?: string | null;

  @Column({
    type: 'enum',
    enum: BillType,
    nullable: true,
  })
  billType?: BillType | null;

  @Column({ type: 'uuid', nullable: true })
  serviceTicketId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  serviceContractId?: string | null;

  @Column({ type: 'integer', nullable: true })
  maxCopyLimit?: number | null;

  // --- Warranty Fields ---
  @Column({
    type: 'enum',
    enum: WarrantyType,
    default: WarrantyType.NONE,
  })
  warrantyType!: WarrantyType;

  @Column({ type: 'int', nullable: true })
  warrantyDurationValue?: number;

  @Column({
    type: 'enum',
    enum: WarrantyDurationUnit,
    nullable: true,
  })
  warrantyDurationUnit?: WarrantyDurationUnit;

  @Column({ type: 'int', nullable: true })
  warrantyCopyLimit?: number;

  @Column({ type: 'boolean', default: false })
  warrantyEmailSent!: boolean;

  @Column({ type: 'boolean', default: false })
  warrantyExpiryEmailSent!: boolean;

  @DeleteDateColumn()
  deletedAt?: Date;

  // --- Quotation Validity Fields ---
  @Column({ name: 'validity_days', type: 'integer', default: 30 })
  validityDays!: number;

  @Column({ name: 'expiry_date', type: 'timestamp', nullable: true })
  expiryDate?: Date | null;

  @Column({ name: 'is_converted', type: 'boolean', default: false })
  isConverted!: boolean;

  // --- Service Estimate Fields (billType = SERVICE) ---
  @Column({ name: 'estimate_valid_until', type: 'timestamp', nullable: true })
  estimateValidUntil?: Date | null;

  @Column({ name: 'estimate_expired', type: 'boolean', default: false })
  estimateExpired!: boolean;

  @Column({ name: 'visit_charge_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  visitChargeAmount!: number;

  @Column({ name: 'visit_charge_method', type: 'varchar', nullable: true })
  visitChargeMethod!: string | null;

  @Column({ name: 'total_discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalDiscountAmount!: number;

  @Column({ name: 'technician_note_to_finance', type: 'text', nullable: true })
  technicianNoteToFinance!: string | null;

  @Column({ name: 'revision_count', type: 'int', default: 0 })
  revisionCount!: number;

  // --- Validity Extension Fields ---
  @Column({ name: 'validity_extension_days', type: 'int', nullable: true })
  validityExtensionDays!: number | null;

  @Column({ name: 'validity_extension_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  validityExtensionFee!: number | null;

  @Column({ name: 'validity_extension_fee_added', type: 'boolean', default: false })
  validityExtensionFeeAdded!: boolean;
}
