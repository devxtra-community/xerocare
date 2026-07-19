import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Branch } from './branchEntity';

export enum VendorStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}

@Entity({ name: 'vendors' })
export class Vendor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Unique per branch (enforced by composite indexes created in db bootstrap),
  // not globally — two branches may register the same real-world vendor.
  @Column()
  name!: string;

  @Column()
  email!: string;

  // Owning branch. NULL = legacy/global vendor, visible only to ADMIN
  // until assigned to a branch.
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId?: string | null;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

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

  @Column({ name: 'vat_number', type: 'varchar', length: 50, nullable: true })
  vatNumber?: string | null;

  @Column({ name: 'country_code', type: 'varchar', length: 2, nullable: true })
  countryCode?: string;

  @Column({ name: 'country_name', type: 'varchar', length: 100, nullable: true })
  countryName?: string;

  @Column({ name: 'state_province', type: 'varchar', length: 100, nullable: true })
  stateProvince?: string | null;

  @Column({ name: 'city', type: 'varchar', length: 100, nullable: true })
  city?: string | null;

  @Column({ name: 'bank_accounts', type: 'jsonb', nullable: true, default: () => "'[]'" })
  bankAccounts?: {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    routingNumber?: string;
    swiftCode?: string;
    /** Country-correct bank identifier: IFSC (India), IBAN (ISO 13616 countries),
     * or a generic bank code elsewhere. Field name kept as `iban` for storage
     * continuity with existing data. */
    iban?: string;
    address?: string;
    branch?: string;
    /** ISO2 country of the BANK itself — independent of the vendor's own
     * country field — a vendor may bank in a different country than they
     * operate in. */
    bankCountry?: string;
    /** Currency this account is held/paid in — may differ from the branch's local
     * currency. */
    currency?: string;
    isPrimary?: boolean;
  }[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
