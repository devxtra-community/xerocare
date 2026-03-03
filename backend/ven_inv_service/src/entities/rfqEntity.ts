import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Branch } from './branchEntity';
import { EmployeeManager } from './employeeManagerEntity';
import { Vendor } from './vendorEntity';
import { RfqItem } from './rfqItemEntity';
import { RfqVendor } from './rfqVendorEntity';

export enum RfqStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PARTIAL_QUOTED = 'PARTIAL_QUOTED',
  FULLY_QUOTED = 'FULLY_QUOTED',
  AWARDED = 'AWARDED',
  CANCELLED = 'CANCELLED',
  CLOSED = 'CLOSED',
}

@Entity({ name: 'rfqs' })
export class Rfq {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  rfq_number!: string;

  @Column({ type: 'uuid' })
  branch_id!: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch;

  @Column({ type: 'uuid' })
  created_by!: string;

  @ManyToOne(() => EmployeeManager)
  @JoinColumn({ name: 'created_by', referencedColumnName: 'employee_id' })
  creator!: EmployeeManager;

  @Column({ type: 'enum', enum: RfqStatus, default: RfqStatus.DRAFT })
  status!: RfqStatus;

  @Column({ type: 'uuid', nullable: true })
  awarded_vendor_id?: string;

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'awarded_vendor_id' })
  awarded_vendor?: Vendor;

  @OneToMany(() => RfqItem, (item: RfqItem) => item.rfq, { cascade: true })
  items!: RfqItem[];

  @OneToMany(() => RfqVendor, (vendor: RfqVendor) => vendor.rfq, { cascade: true })
  vendors!: RfqVendor[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
