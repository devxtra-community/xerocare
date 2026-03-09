import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Rfq } from './rfqEntity';

export enum ItemType {
  MODEL = 'MODEL',
  SPARE_PART = 'SPARE_PART',
}

@Entity({ name: 'rfq_items' })
@Index(['rfq_id', 'item_id'], { unique: true })
export class RfqItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  rfq_id!: string;

  @ManyToOne(() => Rfq, (rfq) => rfq.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfq_id' })
  rfq!: Rfq;

  @Column({ type: 'enum', enum: ItemType })
  item_type!: ItemType;

  // UUID corresponding to either Model or SparePart
  @Column({ type: 'uuid', nullable: true })
  item_id!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'date', nullable: true })
  expected_delivery_date?: Date;
}
