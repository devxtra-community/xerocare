import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Invoice } from './invoiceEntity';
import { CreditNoteStatus } from './enums/creditNoteStatus';
import { CreditNoteType } from './enums/creditNoteType';
import { DamageReason } from './enums/damageReason';

@Entity('credit_notes')
export class CreditNote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  creditNoteNo!: string;

  @Column({ name: 'invoice_id', type: 'uuid' })
  @Index()
  invoiceId!: string;

  @ManyToOne(() => Invoice)
  @JoinColumn({ name: 'invoice_id' })
  invoice!: Invoice;

  @Column({ nullable: true })
  @Index()
  invoiceNumber!: string;

  @Column({ type: 'uuid' })
  @Index()
  customerId!: string;

  @Column({ nullable: true })
  @Index()
  customerName!: string;

  @Column({ type: 'uuid' })
  @Index()
  branchId!: string;

  // ── Item category: PRODUCT (serialized unit) or SPARE_PART (quantity-based) ──
  @Column({ name: 'item_category', type: 'varchar', length: 20, default: 'PRODUCT' })
  itemCategory!: 'PRODUCT' | 'SPARE_PART';

  // ── Product fields (itemCategory = PRODUCT) ──
  @Column({ type: 'uuid', nullable: true })
  @Index()
  productId?: string;

  @Column({ nullable: true })
  productName?: string;

  @Column({ nullable: true })
  modelName?: string;

  @Column({ nullable: true })
  brand?: string;

  @Column({ type: 'varchar', nullable: true })
  serialNumber?: string;

  // ── Spare part fields (itemCategory = SPARE_PART) ──
  @Column({ type: 'uuid', nullable: true })
  @Index()
  sparePartId?: string;

  @Column({ type: 'varchar', nullable: true })
  sku?: string;

  // Number of units being returned (spare parts); always 1 for products
  @Column({ type: 'int', nullable: true })
  quantity?: number;

  // ── Financial ──
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  productAmount!: number;

  // Tax snapshot copied from invoice at creation (B.2)
  @Column({ name: 'tax_name', type: 'varchar', length: 50, nullable: true })
  taxName?: string;

  @Column({ name: 'tax_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  taxPercent?: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  taxAmount?: number;

  @Column({
    type: 'enum',
    enum: CreditNoteType,
  })
  type!: CreditNoteType;

  @Column({
    type: 'enum',
    enum: CreditNoteStatus,
    default: CreditNoteStatus.DRAFT,
  })
  @Index()
  status!: CreditNoteStatus;

  @Column({ type: 'uuid' })
  sellerEmployeeId!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true })
  financeNote?: string;

  @Column({
    type: 'enum',
    enum: DamageReason,
    nullable: true,
  })
  damageReason?: DamageReason;

  // How the refund was settled (B.1 fix — now persisted)
  @Column({ type: 'varchar', nullable: true })
  paymentMode?: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  // ── Replacement / Exchange fields (PRODUCT) ──
  @Column({ type: 'uuid', nullable: true })
  replacementProductId?: string;

  @Column({ type: 'varchar', nullable: true })
  replacementProductName?: string;

  @Column({ type: 'varchar', nullable: true })
  replacementSerialNumber?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  replacementAmount?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  replacementDiscount: number = 0;

  // ── Replacement / Exchange fields (SPARE_PART) ──
  @Column({ type: 'uuid', nullable: true })
  replacementSparePartId?: string;

  @Column({ type: 'varchar', nullable: true })
  replacementSparePartName?: string;

  @Column({ type: 'varchar', nullable: true })
  replacementSparePartSku?: string;

  @Column({ type: 'int', nullable: true })
  replacementQuantity?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
