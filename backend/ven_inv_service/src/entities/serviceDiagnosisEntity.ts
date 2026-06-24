import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ServiceTicket } from './serviceTicketEntity';

@Entity('service_diagnoses')
export class ServiceDiagnosis {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  ticketId!: string;

  @ManyToOne(() => ServiceTicket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket!: ServiceTicket;

  @Column({ type: 'text' })
  problemFound!: string;

  @Column({ type: 'text' })
  rootCause!: string;

  @Column({ type: 'text', nullable: true })
  technicianNotes?: string | null;

  @Column({ type: 'integer', default: 0 })
  meterReading!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
