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

@Entity('service_reports')
export class ServiceReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  ticketId!: string;

  @ManyToOne(() => ServiceTicket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket!: ServiceTicket;

  @Column({ type: 'text' })
  workPerformed!: string;

  @Column({ type: 'text' })
  resolutionDetails!: string;

  @Column({ type: 'integer', default: 0 })
  meterReading!: number;

  @Column({ type: 'timestamp' })
  startTime!: Date;

  @Column({ type: 'timestamp' })
  endTime!: Date;

  @Column({ type: 'integer' })
  totalTimeSpent!: number; // duration in minutes

  @Column({ type: 'text', nullable: true })
  customerRemarks?: string | null;

  @Column({ type: 'text', nullable: true })
  technicianRemarks?: string | null;

  @Column({ type: 'text', nullable: true })
  customerSignature?: string | null;

  @Column({ type: 'text', nullable: true })
  technicianSignature?: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
