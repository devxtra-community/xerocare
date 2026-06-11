import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('service_ticket_activities')
export class ServiceTicketActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  ticketId!: string;

  @Column({ type: 'varchar' })
  activityType!: string; // 'CREATION', 'ASSIGNMENT', 'DIAGNOSIS', 'ESTIMATE_CREATED', etc.

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'uuid', nullable: true })
  performedBy?: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
