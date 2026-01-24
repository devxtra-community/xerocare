import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
@Entity('items')
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  item_code!: string; // SKU-like (SP-TONER-HP-01)

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  brand!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'uuid' })
  vendor_id!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  purchase_price!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  sale_price!: number;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  tax_rate!: number;

  @CreateDateColumn()
  created_at!: Date;
}
