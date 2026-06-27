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
import { ServiceTicket } from './serviceTicketEntity';
import { ServiceEstimateItem } from './serviceEstimateItemEntity';

export enum ServiceEstimateStatus {
  DRAFT = 'DRAFT',
  WAITING_FINANCE_APPROVAL = 'WAITING_FINANCE_APPROVAL',
  FINANCE_APPROVED = 'FINANCE_APPROVED',
  CUSTOMER_APPROVED = 'CUSTOMER_APPROVED',
  REJECTED = 'REJECTED',
  WAITING_ADDITIONAL_APPROVAL = 'WAITING_ADDITIONAL_APPROVAL',
}

@Entity('service_estimates')
export class ServiceEstimate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  ticketId!: string;

  @ManyToOne(() => ServiceTicket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket!: ServiceTicket;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  labourCost!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCost!: number;

  @Column({
    type: 'varchar',
    default: ServiceEstimateStatus.DRAFT,
  })
  status!: ServiceEstimateStatus;

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @Column({ name: 'currency_code', type: 'varchar', length: 3, nullable: true })
  currencyCode?: string;

  @Column({
    name: 'exchange_rate_snapshot',
    type: 'decimal',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  exchangeRateSnapshot?: number;

  @OneToMany(() => ServiceEstimateItem, (item) => item.estimate, { cascade: true })
  items!: ServiceEstimateItem[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
