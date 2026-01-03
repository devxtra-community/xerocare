import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
} from "typeorm";
import { Model } from "./modelEntity";
import { Inventory } from "./inventoryEntity";

export enum ProductStatus {
  AVAILABLE = "available",
  RENTED = "rented",
  SOLD = "sold",
  DAMAGED = "damaged",
}

@Entity("products")
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Model, (model) => model.products)
  @JoinColumn({ name: "model_id" })
  model!: Model;

  @Column()
  model_id!: number;

  @Column()
  vendor_id!: number;

  @Column({ type: "varchar", length: 255, unique: true })
  serial_no!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 100 })
  brand!: string;

  @Column({ type: "date" })
  MFD!: Date;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  rent_price_monthly!: number;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  rent_price_yearly!: number;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  lease_price_monthly!: number;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  lease_price_yearly!: number;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  sale_price!: number;

  @Column({ type: "numeric", precision: 5, scale: 2 })
  tax_rate!: number;

  @Column({
    type: "enum",
    enum: ProductStatus,
    default: ProductStatus.AVAILABLE,
  })
  product_status!: ProductStatus;

  @CreateDateColumn()
  created_at!: Date;

  // One product can exist in multiple warehouses
  @OneToMany(() => Inventory, (inventory) => inventory.product)
  inventory!: Inventory[];
}
