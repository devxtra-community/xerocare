import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Rfq } from './rfqEntity';

export enum ItemType {
  PRODUCT = 'PRODUCT',
  SPARE_PART = 'SPARE_PART',
}

@Entity({ name: 'rfq_items' })
@Index(['rfq_id', 'model_id'], { unique: true, where: 'model_id IS NOT NULL' })
export class RfqItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  rfq_id!: string;

  @ManyToOne(() => Rfq, (rfq) => rfq.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfq_id' })
  rfq!: Rfq;

  @Column({ type: 'uuid', nullable: true })
  branch_id?: string;

  @Column({ type: 'enum', enum: ItemType })
  item_type!: ItemType;

  // PRODUCT item fields
  @Column({ type: 'uuid', nullable: true })
  model_id?: string;

  @Column({ type: 'uuid', nullable: true })
  product_id?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  custom_product_name?: string;

  // SPARE_PART item fields
  @Column({ type: 'uuid', nullable: true })
  brand_id?: string;

  @Column({ type: 'uuid', nullable: true })
  spare_part_id?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  custom_brand_name?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  custom_spare_part_name?: string;

  // Common fields
  @Column({ type: 'varchar', length: 50, nullable: true })
  hs_code?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mpn?: string;

  @Column({ type: 'text', nullable: true })
  compatible_models?: string;

  @Column({ name: 'model_ids', type: 'simple-json', nullable: true })
  modelIds?: string[];

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'date', nullable: true })
  expected_delivery_date?: Date;

  @Column({ type: 'uuid', nullable: true })
  created_by?: string;

  @CreateDateColumn()
  created_at!: Date;
}
