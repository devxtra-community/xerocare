import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('vat_remittances')
export class VatRemittance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @Column({ type: 'date' })
  periodFrom!: Date;

  @Column({ type: 'date' })
  periodTo!: Date;

  /** Amount paid to the tax authority for this period */
  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amountRemitted!: number;

  @Column({ type: 'date' })
  remittedDate!: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceNo?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
