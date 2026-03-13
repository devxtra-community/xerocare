import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum ReadingSource {
  MANUAL = 'MANUAL',
  SYSTEM = 'SYSTEM',
  OCR = 'OCR',
}

/**
 * Records a physical meter reading for a specific device (by serial number).
 * Used during device replacement to snapshot the final/initial meter state.
 */
@Entity('device_meter_readings')
export class DeviceMeterReading {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  @Index()
  serialNumber!: string;

  @Column({ type: 'timestamp' })
  timestamp!: Date;

  @Column({ type: 'int', default: 0 })
  bwA4!: number;

  @Column({ type: 'int', default: 0 })
  bwA3!: number;

  @Column({ type: 'int', default: 0 })
  colorA4!: number;

  @Column({ type: 'int', default: 0 })
  colorA3!: number;

  @Column({
    type: 'enum',
    enum: ReadingSource,
    default: ReadingSource.MANUAL,
  })
  source!: ReadingSource;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  invoiceId?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
