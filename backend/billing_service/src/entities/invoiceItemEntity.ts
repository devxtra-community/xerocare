import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Invoice } from './invoiceEntity';
import { ItemType } from './enums/itemType';

@Entity('invoice_items')
export class InvoiceItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  description!: string;

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

  @ManyToOne(() => Invoice, (invoice) => invoice.items, {
    onDelete: 'CASCADE',
  })
  invoice!: Invoice;
}
