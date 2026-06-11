import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export interface PartUsed {
  partName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  isFree: boolean;
}

@Entity('machine_service_history')
export class MachineServiceHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  productId?: string | null;

  @Column({ type: 'varchar' })
  serialNumber!: string;

  @Column({ type: 'uuid' })
  ticketId!: string;

  @Column({ type: 'timestamp' })
  serviceDate!: Date;

  @Column({ type: 'varchar' })
  serviceContext!: string;

  @Column({ type: 'integer', default: 0 })
  meterReading!: number;

  @Column({ type: 'jsonb', nullable: true })
  partsUsed?: PartUsed[]; // Array of { partName: string, sku: string, quantity: number, unitPrice: number, isFree: boolean }

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCost!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  customerCharge!: number;

  @CreateDateColumn()
  created_at!: Date;
}
