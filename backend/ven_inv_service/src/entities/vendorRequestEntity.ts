import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vendor } from './vendorEntity';

@Entity({ name: 'vendor_requests' })
export class VendorRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  vendor_id!: string;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor!: Vendor;

  @Column({ type: 'uuid', nullable: true })
  requested_by?: string;

  @Column({ type: 'uuid', nullable: true })
  branch_id?: string;

  @Column({ type: 'text' })
  products!: string;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @CreateDateColumn()
  created_at!: Date;
}
