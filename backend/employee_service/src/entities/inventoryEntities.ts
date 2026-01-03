import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  Entity,
  Index,
} from 'typeorm';

@Entity('inventory')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  sku!: string | null;

  @Column({ type: 'varchar', length: 100 })
    printer_model!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  unit_price!: number | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
