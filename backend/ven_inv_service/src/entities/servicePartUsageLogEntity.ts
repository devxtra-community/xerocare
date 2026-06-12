import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('service_part_usage_logs')
export class ServicePartUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  productId!: string; // Which machine

  @Column({ type: 'uuid' })
  ticketId!: string; // Which service ticket

  @Column({ type: 'uuid', nullable: true })
  sparePartId!: string | null; // From inventory catalog

  @Column({ type: 'varchar' })
  partName!: string;

  @Column({ type: 'varchar', nullable: true })
  sku!: string | null;

  @Column({ type: 'int' })
  quantityUsed!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitCost!: number; // Internal cost (even if charged QAR 0 to customer)

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalCost!: number;

  @Column({ type: 'boolean', default: false })
  isFree!: boolean;

  @Column({ type: 'boolean', default: false })
  isConsumable!: boolean; // True for toners, drums, etc.

  @Column({ type: 'int', nullable: true })
  meterReadingAtReplacement!: number | null; // Meter count when this part was replaced

  @Column({ type: 'int', nullable: true })
  previousMeterReading!: number | null; // Meter count when previous same part was replaced

  @Column({ type: 'int', nullable: true })
  calculatedYield!: number | null;
  // Auto-calculated: meterReadingAtReplacement - previousMeterReading
  // Only for consumables (toners, drums)

  @Column({ type: 'varchar', nullable: true })
  linkedInvoiceId!: string | null; // The original sale/rent/lease invoice

  @CreateDateColumn()
  replacedAt!: Date;
}
