import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

const roleAdmin = 'ADMIN';

@Entity('admin')
export class Admin {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  password_hash!: string;

  @Column({ type: 'varchar', length: 255, default: roleAdmin })
  role!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;
}
