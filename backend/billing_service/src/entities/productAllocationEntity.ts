import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Invoice } from './invoiceEntity';

export enum AllocationStatus {
  ALLOCATED = 'ALLOCATED',
  RETURNED = 'RETURNED',
}

@Entity('product_allocations')
export class ProductAllocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  contractId!: string;

  @ManyToOne(() => Invoice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contractId' })
  contract!: Invoice;

  @Column({ type: 'uuid' })
  modelId!: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  productId?: string; // Physical product ID in Inventory Service

  @Column({ type: 'varchar' })
  serialNumber!: string;

  @Column({
    type: 'enum',
    enum: AllocationStatus,
    default: AllocationStatus.ALLOCATED,
  })
  status!: AllocationStatus;

  // --- Initial Meter Readings ---
  @Column({ type: 'int', default: 0 })
  initialBwA4!: number;

  @Column({ type: 'int', default: 0 })
  initialBwA3!: number;

  @Column({ type: 'int', default: 0 })
  initialColorA4!: number;

  @Column({ type: 'int', default: 0 })
  initialColorA3!: number;

  // --- Current Meter Readings (Evolving) ---
  @Column({ type: 'int', default: 0 })
  currentBwA4!: number;

  @Column({ type: 'int', default: 0 })
  currentBwA3!: number;

  @Column({ type: 'int', default: 0 })
  currentColorA4!: number;

  @Column({ type: 'int', default: 0 })
  currentColorA3!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
