import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  entityId!: string; // The ID of the Invoice / Contract

  @Column({ type: 'varchar' })
  action!: string; // e.g. 'STATUS_CHANGE', 'ALLOCATION', 'ACTIVATION', 'PAYMENT', 'CREATION'

  @Column({ type: 'varchar' })
  performedBy!: string; // The userId or email who performed the action

  @Column({ type: 'text', nullable: true })
  oldValue?: string; // JSON or text of old value

  @Column({ type: 'text', nullable: true })
  newValue?: string; // JSON or text of new value

  @Column({ type: 'text', nullable: true })
  details?: string; // Detailed human-readable explanation

  @CreateDateColumn()
  createdAt!: Date;
}
