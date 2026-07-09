import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('country_tax_rules')
export class CountryTaxRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'country', type: 'varchar', length: 2, unique: true })
  country!: string;

  @Column({ name: 'tax_name', type: 'varchar', length: 50 })
  taxName!: string;

  @Column({ name: 'default_tax_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  defaultTaxPercent?: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
