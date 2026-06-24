import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('consumable_yield_history')
export class ConsumableYieldHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  productId?: string | null;

  @Column({ type: 'varchar' })
  serialNumber!: string;

  @Column({ type: 'varchar' })
  tonerSku!: string;

  @Column({ type: 'timestamp' })
  installedDate!: Date;

  @Column({ type: 'integer' })
  installedMeterReading!: number;

  @Column({ type: 'timestamp', nullable: true })
  replacedDate?: Date | null;

  @Column({ type: 'integer', nullable: true })
  replacedMeterReading?: number | null;

  @Column({ type: 'integer', nullable: true })
  yieldPages?: number | null;

  @Column({ type: 'uuid' })
  ticketId!: string;

  @CreateDateColumn()
  created_at!: Date;
}
