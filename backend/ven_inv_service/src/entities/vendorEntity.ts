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

  @Column({ type: 'varchar', length: 10, default: 'QAR' })
  currency!: string;

  @Column({ name: 'country_code', type: 'varchar', length: 2, nullable: true })
  countryCode?: string;

  @Column({ name: 'country_name', type: 'varchar', length: 100, nullable: true })
  countryName?: string;

  @Column({ name: 'bank_accounts', type: 'jsonb', nullable: true, default: () => "'[]'" })
  bankAccounts?: {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    routingNumber?: string;
    swiftCode?: string;
    iban?: string;
    ifscCode?: string;
    isPrimary?: boolean;
  }[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
