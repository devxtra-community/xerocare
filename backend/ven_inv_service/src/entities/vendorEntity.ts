import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum VendorStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}

@Entity({ name: 'vendors' })
export class Vendor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({
    type: 'enum',
    enum: ['Supplier', 'Distributor', 'Service'],
    default: 'Supplier',
  })
  type!: 'Supplier' | 'Distributor' | 'Service';

  @Column({ nullable: true })
  contactPerson?: string;

  @Column({ type: 'int', default: 0 })
  totalOrders!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  purchaseValue!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  outstandingAmount!: number;

  @Column({
    type: 'enum',
    enum: VendorStatus,
    default: VendorStatus.ACTIVE,
  })
  status!: VendorStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
