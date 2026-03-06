import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ReadingSource {
  MANUAL = 'MANUAL',
  SYSTEM = 'SYSTEM',
}

@Entity('device_meter_readings')
export class DeviceMeterReading {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  @Index()
  serialNumber!: string;

  @Column({ type: 'timestamp' })
  @Index()
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
  invoiceId?: string; // Optional: Link reading to a specific contract if needed

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
