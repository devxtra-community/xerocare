import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ServiceTicket } from './serviceTicketEntity';

export enum ServiceItemSource {
  SPARE_PART = 'SPARE_PART',
  CUSTOM = 'CUSTOM',
}

@Entity('service_ticket_items')
export class ServiceTicketItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  ticketId!: string;

  @ManyToOne(() => ServiceTicket, (ticket) => ticket.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket!: ServiceTicket;

  @Column({
    type: 'enum',
    enum: ServiceItemSource,
  })
  itemSource!: ServiceItemSource;

  @Column({ type: 'uuid', nullable: true })
  sparePartId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  sku?: string | null;

  @Column({ type: 'varchar', nullable: true })
  barcodeId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  customPartName?: string | null;

  @Column({ type: 'varchar', nullable: true })
  customPartBrand?: string | null;

  @Column({ type: 'text', nullable: true })
  customPartDescription?: string | null;

  @Column()
  partName!: string;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPrice?: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalPrice?: number | null;

  @Column({ type: 'boolean', default: false })
  isFree!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
