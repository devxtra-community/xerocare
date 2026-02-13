import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Model } from './modelEntity';
import { Branch } from './branchEntity';

@Entity('spare_parts')
export class SparePart {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'item_code' })
  @Index()
  item_code!: string; // Matches DB column

  @Column({ name: 'part_name' })
  part_name!: string;

  @Column({ name: 'brand' })
  brand!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'model_id', nullable: true }) // Nullable implies universal parts
  model_id?: string;

  @ManyToOne(() => Model, { nullable: true })
  @JoinColumn({ name: 'model_id' })
  model?: Model;

  @Column({ name: 'branch_id' })
  @Index()
  branch_id!: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch;

  @Column({ name: 'lot_id', nullable: true })
  lot_id?: string;

  //   @ManyToOne(() => Lot, { nullable: true })
  //   @JoinColumn({ name: 'lot_id' })
  //   lot?: Lot;

  @Column({ name: 'base_price', type: 'decimal', precision: 12, scale: 2, default: 0 })
  base_price!: number;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @Column({ nullable: true })
  image_url?: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
