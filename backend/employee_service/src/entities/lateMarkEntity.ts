import {
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Employee } from './employeeEntities';
import { Branch } from './branchEntity';

@Entity('late_marks')
@Unique(['employee_id', 'date'])
export class LateMark {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar' })
  employee_id!: string;

  @Index()
  @Column({ type: 'varchar' })
  branch_id!: string;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'varchar' })
  marked_by!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @ManyToOne(() => Branch, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'marked_by' })
  markedByEmployee!: Employee;
}
