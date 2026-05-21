import { Entity, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('processed_invoice_items')
export class ProcessedInvoiceItem {
  @PrimaryColumn({ name: 'invoice_item_id', type: 'uuid' })
  invoiceItemId!: string;

  @CreateDateColumn({ name: 'processed_at' })
  processedAt!: Date;
}
