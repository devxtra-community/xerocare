import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('employee_managers')
export class EmployeeManager {
  @PrimaryColumn()
  employee_id!: string;

  @Column()
  email!: string;

  @Column()
  status!: string;

  @Column({ nullable: true })
  name?: string;

  @CreateDateColumn()
  synced_at!: Date;
}
