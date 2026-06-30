import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ManualPayable } from './manualPayableEntity';

@Entity('payable_payments')
export class PayablePayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  payableId!: string;

  @ManyToOne(() => ManualPayable, (p) => p.payments)
  @JoinColumn({ name: 'payableId' })
  payable!: ManualPayable;

  @Column({ type: 'date' })
  paymentDate!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'uuid', nullable: true })
  paidFromAccount?: string;

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
