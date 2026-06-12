import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('inventory_reservations')
export class InventoryReservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  ticketId!: string;

  @Column({ type: 'uuid' })
  sparePartId!: string;

  @Column({ type: 'int' })
  reservedQuantity!: number;

  @Column({ type: 'varchar', default: 'RESERVED' })
  status!: 'RESERVED' | 'CONSUMED' | 'RELEASED';

  @CreateDateColumn()
  reservedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  consumedAt!: Date | null;
}
