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

/**
 * One legal/HR document belonging to an employee — passport, visa, labour
 * contract, driving license, etc. An employee has many of these. The original
 * single `employee.id_proof_key` stays as the "primary ID" shortcut; everything
 * else lives here.
 *
 * `doc_type` is a plain varchar (not a DB enum) so adding a new document kind is
 * a code-only change, matching how `employee.status` history was handled.
 */
@Entity('employee_documents')
export class EmployeeDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  employee_id!: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE', createForeignKeyConstraints: false })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @Column({ type: 'varchar', length: 40 })
  doc_type!: string;

  /** Free-text name shown in the UI, e.g. "Passport (old)" or "Trade licence". */
  @Column({ type: 'varchar', length: 200, nullable: true })
  label!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  document_number!: string | null;

  @Column({ type: 'date', nullable: true })
  issue_date!: string | null;

  @Column({ type: 'date', nullable: true })
  expiry_date!: string | null;

  /** R2 object key (private prefix `employee-documents/`). */
  @Column({ type: 'varchar', length: 500 })
  file_key!: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  file_name!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  file_mime!: string | null;

  @Column({ type: 'uuid', nullable: true })
  uploaded_by!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
