import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { RfqVendor } from './rfqVendorEntity';
import { RfqItem } from './rfqItemEntity';

@Entity({ name: 'rfq_vendor_items' })
@Index(['rfq_vendor_id', 'rfq_item_id'], { unique: true })
export class RfqVendorItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  rfq_vendor_id!: string;

  @ManyToOne(() => RfqVendor, (vendor) => vendor.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfq_vendor_id' })
  rfq_vendor!: RfqVendor;

  @Column({ type: 'uuid' })
  rfq_item_id!: string;

  @ManyToOne(() => RfqItem)
  @JoinColumn({ name: 'rfq_item_id' })
  rfq_item!: RfqItem;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  unit_price?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  total_price?: number;

  // Vendor-declared tax treatment for this line. Purely informational — helps the
  // manager read the quote. No amount is derived from it; customs duty, freight and
  // every other landing cost are entered separately on the lot.
  // true = quoted price already includes tax, false = tax added on top, null = not stated.
  @Column({ type: 'boolean', nullable: true })
  tax_included?: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  tax_rate_percent?: number;

  @Column({
    type: 'enum',
    enum: ['IN_STOCK', 'OUT_OF_STOCK', 'ON_PRODUCTION'],
    nullable: true,
  })
  stock_status?: 'IN_STOCK' | 'OUT_OF_STOCK' | 'ON_PRODUCTION';

  @Column({ type: 'int', nullable: true })
  available_quantity?: number;

  @Column({ type: 'date', nullable: true })
  estimated_shipment_date?: Date;

  @Column({ type: 'text', nullable: true })
  vendor_note?: string;

  @Column({ type: 'text', nullable: true })
  remarks?: string;
}
