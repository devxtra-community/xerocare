import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from "typeorm";
import { Product } from "./productEntity";

@Entity("model")
export class Model {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  model_no!: string;

  @Column({ type: "varchar", length: 255 })
  model_name!: string;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  wholesale_price!: number;

  @OneToMany(() => Product, (product) => product.model)
  products!: Product[];
}
