import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Invoice } from './invoiceEntity';

export enum ReportedBy {
  CUSTOMER = 'CUSTOMER',
  EMPLOYEE = 'EMPLOYEE',
}

@Entity('usage_records')
export class UsageRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  contractId!: string;

  @ManyToOne(() => Invoice)
  @JoinColumn({ name: 'contractId' })
  contract!: Invoice;

  @Column({ type: 'date' })
  billingPeriodStart!: Date;

  @Column({ type: 'date' })
  billingPeriodEnd!: Date;

  // Raw Readings (A4/A3 Separation)
  @Column({ type: 'int', default: 0 })
  bwA4Count!: number;

  @Column({ type: 'int', default: 0 })
  bwA3Count!: number;

  @Column({ type: 'int', default: 0 })
  colorA4Count!: number;

  @Column({ type: 'int', default: 0 })
  colorA3Count!: number;

  // Monthly Consumption (Delta)
  @Column({ type: 'int', default: 0 })
  bwA4Delta!: number;

  @Column({ type: 'int', default: 0 })
  bwA3Delta!: number;

  @Column({ type: 'int', default: 0 })
  colorA4Delta!: number;

  @Column({ type: 'int', default: 0 })
  colorA3Delta!: number;

  @Column({ type: 'int', default: 0 })
  exceededTotal!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  exceededCharge!: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  monthlyRent!: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  advanceAdjusted!: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalCharge!: number;

  @Column({
    type: 'enum',
    enum: ReportedBy,
    default: ReportedBy.EMPLOYEE,
  })
  reportedBy!: ReportedBy;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  // Meter Reading Image (R2)
  @Column({ type: 'text', nullable: true })
  meterImageUrl?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  emailSentAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  whatsappSentAt?: Date;
}
