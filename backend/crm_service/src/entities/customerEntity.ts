import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  @Index({ unique: true })
  email?: string;

  @Column({ nullable: true })
  @Index()
  phone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ name: 'vat_number', type: 'varchar', length: 50, nullable: true })
  vatNumber?: string | null;

  @Column({ name: 'country', type: 'varchar', length: 2, nullable: true })
  country?: string | null;

  @Column({ name: 'state_province', type: 'varchar', length: 100, nullable: true })
  stateProvince?: string | null;

  @Column({ name: 'city', type: 'varchar', length: 100, nullable: true })
  city?: string | null;

  @Column({ name: 'bank_name', type: 'varchar', length: 100, nullable: true })
  bankName?: string | null;

  @Column({ name: 'bank_account_number', type: 'varchar', length: 50, nullable: true })
  bankAccountNumber?: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ name: 'branch_id', nullable: true })
  @Index()
  branch_id?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
