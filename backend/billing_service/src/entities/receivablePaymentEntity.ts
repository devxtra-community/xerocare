import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ManualReceivable } from './manualReceivableEntity';

@Entity('receivable_payments')
export class ReceivablePayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  receivableId!: string;

  @ManyToOne(() => ManualReceivable, (r) => r.payments)
  @JoinColumn({ name: 'receivableId' })
  receivable!: ManualReceivable;

  @Column({ type: 'date' })
  paymentDate!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'uuid', nullable: true })
  paidToAccount?: string;

  @Column({ type: 'varchar', nullable: true })
  paymentMode?: string;

  @Column({ type: 'varchar', nullable: true })
  referenceNo?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column()
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
