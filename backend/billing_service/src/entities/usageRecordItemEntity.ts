import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UsageRecord } from './usageRecordEntity';
import { ProductAllocation } from './productAllocationEntity';

@Entity('usage_record_items')
export class UsageRecordItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  usageRecordId!: string;

  @ManyToOne(() => UsageRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usageRecordId' })
  usageRecord!: UsageRecord;

  @Column({ type: 'uuid' })
  @Index()
  allocationId!: string;

  @ManyToOne(() => ProductAllocation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'allocationId' })
  allocation!: ProductAllocation;

  @Column({ type: 'timestamp' })
  periodStart!: Date;

  @Column({ type: 'timestamp' })
  periodEnd!: Date;

  @Column({ type: 'int', default: 0 })
  startBwA4!: number;

  @Column({ type: 'int', default: 0 })
  endBwA4!: number;

  @Column({ type: 'int', default: 0 })
  deltaBwA4!: number;

  @Column({ type: 'int', default: 0 })
  startBwA3!: number;

  @Column({ type: 'int', default: 0 })
  endBwA3!: number;

  @Column({ type: 'int', default: 0 })
  deltaBwA3!: number;

  @Column({ type: 'int', default: 0 })
  startColorA4!: number;

  @Column({ type: 'int', default: 0 })
  endColorA4!: number;

  @Column({ type: 'int', default: 0 })
  deltaColorA4!: number;

  @Column({ type: 'int', default: 0 })
  startColorA3!: number;

  @Column({ type: 'int', default: 0 })
  endColorA3!: number;

  @Column({ type: 'int', default: 0 })
  deltaColorA3!: number;
}
