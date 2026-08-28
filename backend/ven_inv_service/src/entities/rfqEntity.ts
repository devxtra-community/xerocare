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
import { PurchaseOrigin } from './enums/purchaseOrigin';
import { Warehouse } from './warehouseEntity';

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

  // Delivery warehouse chosen at award time — required by RfqService.awardVendor
  // going forward, sent to the vendor in the award email, and inherited by
  // createLotFromRfq so the lot is never created without one. Nullable at the
  // DB level only because RFQs awarded before this field existed have none.
  @Column({ type: 'uuid', nullable: true })
  awarded_warehouse_id?: string;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'awarded_warehouse_id' })
  awarded_warehouse?: Warehouse;

  // Snapshotted once at award time (see RfqService.awardVendor). Never recalculated.
  @Column({
    name: 'purchase_origin',
    type: 'enum',
    enum: PurchaseOrigin,
    nullable: true,
  })
  purchase_origin?: PurchaseOrigin;

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
