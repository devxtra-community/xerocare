import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vendor } from './vendorEntity';
import { Branch } from './branchEntity';
import { EmployeeManager } from './employeeManagerEntity';

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

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @ManyToOne(() => EmployeeManager, { nullable: true })
  @JoinColumn({ name: 'requested_by', referencedColumnName: 'employee_id' })
  manager?: EmployeeManager;

  @Column({ type: 'text' })
  products!: string;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  total_amount?: number;

  @CreateDateColumn()
  created_at!: Date;
}
