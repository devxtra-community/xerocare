import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './productEntity';
import { Brand } from './brandEntity';
import { MachineType } from './enums/machineType';

@Entity('model')
@Index(['model_no', 'branch_id'], { unique: true })
export class Model {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  model_no!: string;

  @Column({ type: 'varchar', length: 255 })
  model_name!: string;

  @Column({ type: 'uuid', nullable: true })
  brand_id!: string;

  @ManyToOne(() => Brand, (brand) => brand.models)
  @JoinColumn({ name: 'brand_id' })
  brandRelation?: Brand;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({
    type: 'numeric',
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  quantity!: number;

  @Column({
    type: 'numeric',
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  available!: number;

  @Column({
    type: 'numeric',
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  rented!: number;

  @Column({
    type: 'numeric',
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  leased!: number;

  @Column({
    type: 'numeric',
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  sold!: number;

  @Column({ type: 'uuid', nullable: true })
  branch_id?: string;

  @Column({
    name: 'max_discountable_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  maxDiscountableAmount!: number;

  // Default machine type for products of this model (PRINTER / COMPUTER / OTHER).
  @Column({ name: 'machine_type', type: 'varchar', length: 20, default: MachineType.PRINTER })
  machine_type!: MachineType;

  @OneToMany(() => Product, (product) => product.model)
  products!: Product[];
}
