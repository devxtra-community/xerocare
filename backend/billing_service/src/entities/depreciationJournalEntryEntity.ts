import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('depreciation_journal_entries')
export class DepreciationJournalEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  periodYear!: number;

  @Column()
  periodMonth!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount!: number;

  @Column()
  branchId!: string;

  @Column({ default: 'PENDING' })
  status!: string; // PENDING | POSTED

  @Column({ type: 'uuid', nullable: true })
  postedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  postedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  expenseEntryId?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
