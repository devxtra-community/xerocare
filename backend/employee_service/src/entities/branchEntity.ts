import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('branches')
export class Branch {
  @PrimaryColumn({ type: 'varchar' })
  branch_id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  location!: string;

  @Column({ default: 'ACTIVE' })
  status!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  synced_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;
}
