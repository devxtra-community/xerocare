import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from './employeeEntities';
import { Admin } from './adminEntities';

@Entity('auth')
export class Auth {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee | null;

  @ManyToOne(() => Admin, (admin) => admin.auths, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_id' })
  admin!: Admin | null;

  @Column()
  refresh_token!: string;

  @Column({ nullable: true })
  ip_address!: string;

  @Column({ nullable: true })
  user_agent!: string;

  // Set when this refresh token has been rotated. Kept (rather than deleted)
  // for a short grace window so a second request racing the one that already
  // rotated it — two open tabs, or several API calls firing at once right as
  // the access token expires — can still succeed instead of forcing a logout.
  // See AuthService.refresh().
  @Column({ type: 'timestamp with time zone', nullable: true })
  superseded_at!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  superseded_by_token!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
