import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Branch } from './branchEntity';

export enum WarehouseStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}

@Entity('warehouses')
export class Warehouse {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'warehouse_name' })
  warehouseName!: string;

  @Column({ name: 'warehouse_code', unique: true })
  warehouseCode!: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  capacity!: string;

  @Column({ nullable: true })
  country?: string;

  // Contact person is an employee from the warehouse's branch. Employees are
  // owned by employee_service, so we store the id plus a denormalised name/email
  // for display without a cross-service join.
  @Column({ name: 'contact_person_id', type: 'uuid', nullable: true })
  contactPersonId?: string;

  @Column({ name: 'contact_person_name', nullable: true })
  contactPersonName?: string;

  @Column({ name: 'contact_person_email', nullable: true })
  contactPersonEmail?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: WarehouseStatus.ACTIVE,
  })
  status!: WarehouseStatus;

  @Column({ name: 'branch_id', nullable: true })
  @Index() // Optimizes getBranchInventory WHERE clause
  branchId!: string;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
