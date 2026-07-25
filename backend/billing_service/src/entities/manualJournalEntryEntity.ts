import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// Simplified single-posting journal (same shape as EquityEntry) for any custom
// MANUAL_JOURNAL chart-of-accounts row. amount is signed relative to the account's
// natural balance direction — positive increases it, negative decreases it.
@Entity('manual_journal_entries')
export class ManualJournalEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  entryNo!: string;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'uuid' })
  chartOfAccountId!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount!: number;

  @Column({ type: 'text' })
  description!: string;

  @Column()
  branchId!: string;

  @Column({ type: 'varchar', nullable: true })
  referenceNo?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column()
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
