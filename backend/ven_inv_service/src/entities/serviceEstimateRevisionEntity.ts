import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ServiceEstimate } from './serviceEstimateEntity';
import { ServiceTicket } from './serviceTicketEntity';
import { ServiceEstimateItem } from './serviceEstimateItemEntity';

@Entity('service_estimate_revisions')
export class ServiceEstimateRevision {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  estimateId!: string;

  @ManyToOne(() => ServiceEstimate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estimateId' })
  estimate!: ServiceEstimate;

  @Column({ type: 'uuid' })
  ticketId!: string;

  @ManyToOne(() => ServiceTicket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket!: ServiceTicket;

  @Column({ type: 'integer' })
  version!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  labourCost!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCost!: number;

  @Column({ type: 'varchar' })
  status!: string; // 'DRAFT', 'WAITING_ADDITIONAL_APPROVAL', 'APPROVED', 'REJECTED'

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @OneToMany(() => ServiceEstimateItem, (item) => item.revision, { cascade: true })
  items!: ServiceEstimateItem[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
