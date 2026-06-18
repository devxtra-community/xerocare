import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ServiceEstimate } from './serviceEstimateEntity';
import { ServiceEstimateRevision } from './serviceEstimateRevisionEntity';

export enum ServiceEstimateItemSource {
  SPARE_PART = 'SPARE_PART',
  CUSTOM = 'CUSTOM',
}

@Entity('service_estimate_items')
export class ServiceEstimateItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  estimateId?: string | null;

  @ManyToOne(() => ServiceEstimate, (estimate) => estimate.items, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'estimateId' })
  estimate?: ServiceEstimate | null;

  @Column({ type: 'uuid', nullable: true })
  revisionId?: string | null;

  @ManyToOne(() => ServiceEstimateRevision, (revision) => revision.items, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'revisionId' })
  revision?: ServiceEstimateRevision | null;

  @Column({
    type: 'enum',
    enum: ServiceEstimateItemSource,
  })
  itemSource!: ServiceEstimateItemSource;

  @Column({ type: 'uuid', nullable: true })
  sparePartId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  sku?: string | null;

  @Column({ type: 'varchar', nullable: true })
  partName!: string;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPrice?: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalPrice?: number | null;

  @Column({ type: 'boolean', default: false })
  isFree!: boolean;

  @Column({ type: 'boolean', default: true })
  isApproved!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
