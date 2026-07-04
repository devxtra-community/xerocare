import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Cheque } from './chequeEntity';

@Entity('cheque_status_history')
export class ChequeStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'cheque_id', type: 'uuid' })
  chequeId!: string;

  @ManyToOne(() => Cheque, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cheque_id' })
  cheque!: Cheque;

  @Column({ name: 'from_status', type: 'varchar', nullable: true })
  fromStatus?: string;

  @Column({ name: 'to_status' })
  toStatus!: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'changed_by' })
  changedBy!: string;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt!: Date;
}
