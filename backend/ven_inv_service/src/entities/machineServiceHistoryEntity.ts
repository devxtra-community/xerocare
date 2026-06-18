import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('machine_service_history')
export class MachineServiceHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  productId!: string; // Links to Product entity

  @Column({ type: 'varchar' })
  serialNumber!: string;

  @Column({ type: 'int', default: 0 })
  totalServiceVisits!: number;

  @Column({ type: 'int', default: 0 })
  totalPreventativeVisits!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastServiceDate!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  nextScheduledMaintenanceDate!: Date | null; // For RENT: lastServiceDate + 2 months

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalPartsSpend!: number; // Lifetime cost of all parts used (even if FOC)

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalLabourSpend!: number; // Lifetime labour cost (even if FOC)

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalLifetimeCost!: number; // totalPartsSpend + totalLabourSpend

  @UpdateDateColumn()
  updatedAt!: Date;
}
