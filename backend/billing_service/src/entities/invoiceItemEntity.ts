import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, DeleteDateColumn } from 'typeorm';
import { Invoice } from './invoiceEntity';
import { ItemType } from './enums/itemType';

@Entity('invoice_items')
export class InvoiceItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', nullable: true, default: '' })
  description?: string;

  @Column({
    type: 'enum',
    enum: ItemType,
    default: ItemType.PRICING_RULE,
  })
  itemType!: ItemType;

  // --- Fixed Rent Limits ---
  @Column({ type: 'int', nullable: true })
  bwIncludedLimit?: number;

  @Column({ type: 'int', nullable: true })
  colorIncludedLimit?: number;

  @Column({ type: 'int', nullable: true })
  combinedIncludedLimit?: number;

  // --- Excess Rates ---
  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  bwExcessRate?: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  colorExcessRate?: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  combinedExcessRate?: number;

  // --- Separate A3 / A4 Pricing (CPC only) ---
  // When true, an A3 page is NOT converted into A4-equivalent clicks via a3Multiplier.
  // A4 pages bill at bwExcessRate / colorExcessRate (or their slab ranges) and A3 pages
  // bill 1:1 at their own rate below. The A3 rate IS the size premium — applying the
  // multiplier on top of it would charge the premium twice.
  @Column({ type: 'boolean', nullable: true, default: false })
  separateA3Pricing?: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  bwA3ExcessRate?: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  colorA3ExcessRate?: number;

  // --- CPC Slabs (JSON) ---
  @Column({ type: 'json', nullable: true })
  bwSlabRanges?: Array<{ from: number; to: number; rate: number }>;

  @Column({ type: 'json', nullable: true })
  colorSlabRanges?: Array<{ from: number; to: number; rate: number }>;

  @Column({ type: 'json', nullable: true })
  comboSlabRanges?: Array<{ from: number; to: number; rate: number }>;

  // --- Legacy / Future Usage ---
  @Column({ type: 'int', nullable: true, default: 0 })
  quantity?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, default: 0 })
  unitPrice?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, default: 0 })
  discountAmount?: number;

  @Column({ type: 'int', nullable: true })
  initialBwCount?: number;

  @Column({ type: 'int', nullable: true })
  initialBwA3Count?: number;

  @Column({ type: 'int', nullable: true })
  initialColorCount?: number;

  @Column({ type: 'int', nullable: true })
  initialColorA3Count?: number;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ type: 'uuid', nullable: true })
  sparePartId?: string;

  @Column({ type: 'varchar', nullable: true })
  serialNumber?: string;

  @Column({ type: 'varchar', nullable: true })
  modelId?: string;

  @Column({ type: 'varchar', nullable: true })
  warranty?: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.items, {
    onDelete: 'CASCADE',
  })
  invoice!: Invoice;

  @DeleteDateColumn()
  deletedAt?: Date;
}
