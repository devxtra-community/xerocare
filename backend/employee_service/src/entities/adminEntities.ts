import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Auth } from './authEntities';

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

  @OneToMany(() => Auth, (auth) => auth.admin)
  auths!: Auth[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;
}
