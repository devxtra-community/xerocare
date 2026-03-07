import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Rfq } from './rfqEntity';
import { Vendor } from './vendorEntity';
import { RfqVendorItem } from './rfqVendorItemEntity';

export enum RfqVendorStatus {
  INVITED = 'INVITED',
  QUOTED = 'QUOTED',
  REJECTED = 'REJECTED',
  AWARDED = 'AWARDED',
}

@Entity({ name: 'rfq_vendors' })
@Index(['rfq_id', 'vendor_id'], { unique: true })
@Index('IDX_RFQ_VENDOR_AWARDED', ['rfq_id'], { unique: true, where: "status = 'AWARDED'" })
export class RfqVendor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  rfq_id!: string;

  @ManyToOne(() => Rfq, (rfq) => rfq.vendors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfq_id' })
  rfq!: Rfq;

  @Column({ type: 'uuid' })
  vendor_id!: string;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor!: Vendor;

  @Column({ type: 'enum', enum: RfqVendorStatus, default: RfqVendorStatus.INVITED })
  status!: RfqVendorStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  total_quoted_amount?: number;

  @Column({ type: 'timestamp', nullable: true })
  quoted_at?: Date;

  @OneToMany(() => RfqVendorItem, (vendorItem) => vendorItem.rfq_vendor, { cascade: true })
  items!: RfqVendorItem[];

  @CreateDateColumn()
  created_at!: Date;
}
