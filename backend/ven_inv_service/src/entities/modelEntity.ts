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

  @Column({ type: 'numeric', default: 0 })
  quantity!: number;

  @OneToMany(() => Product, (product) => product.model)
  products!: Product[];
}
