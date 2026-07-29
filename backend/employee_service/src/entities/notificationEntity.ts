import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from './employeeEntities';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar' })
  employee_id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', length: 50, default: 'INFO' })
  type!: string;

  @Column({ type: 'jsonb', nullable: true })
  data!: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  is_read!: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  // employee_id is a recipient ID, not strictly an Employee row — Admin accounts
  // (a separate table, not a role on Employee) are valid recipients too via the
  // notifyAdmins broadcast, so this must not be a real foreign key constraint.
  // See dataSource.ts's FK-drop bootstrap for the matching fix on existing DBs.
  @ManyToOne(() => Employee, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;
}
