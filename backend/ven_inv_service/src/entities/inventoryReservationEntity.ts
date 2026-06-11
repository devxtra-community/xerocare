import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SparePart } from './sparePartEntity';

export enum ReservationStatus {
  RESERVED = 'RESERVED',
  CONSUMED = 'CONSUMED',
  RELEASED = 'RELEASED',
}

@Entity('inventory_reservations')
export class InventoryReservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  ticketId!: string;

  @Column({ type: 'uuid' })
  sparePartId!: string;

  @ManyToOne(() => SparePart, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sparePartId' })
  sparePart!: SparePart;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.RESERVED,
  })
  status!: ReservationStatus;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
