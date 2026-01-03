import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Product } from "./productEntity";

@Entity("inventory")
export class Inventory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Product, (product) => product.inventory)
  @JoinColumn({ name: "product_id" })
  product!: Product;

  @Column()
  product_id!: number;

  @Column()
  warehouse_id!: number;

  @Column({ type: "int", default: 0 })
  available_stock!: number;

  @Column({ type: "int", default: 0 })
  reserved_stock!: number;

  @Column({ type: "int", default: 0 })
  damaged_stock!: number;
}
