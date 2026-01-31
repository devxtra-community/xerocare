import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index } from 'typeorm';
import { Product } from './productEntity';

@Entity('model')
@Index(['model_no'], { unique: true })
export class Model {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  model_no!: string;

  @Column({ type: 'varchar', length: 255 })
  model_name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  // Pricing columns currently missing in DB schema, commenting out to fix 500 error
  // @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  // rent_price_monthly!: number;

  // @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  // rent_price_yearly!: number;

  // @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  // lease_price_monthly!: number;

  // @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  // lease_price_yearly!: number;

  // @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  // sale_price!: number;

  // @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  // wholesale_price!: number;

  @OneToMany(() => Product, (product) => product.model)
  products!: Product[];
}
