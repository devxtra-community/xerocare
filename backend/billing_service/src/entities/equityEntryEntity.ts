import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type EquityType =
  | 'SHARE_CAPITAL'
  | 'RETAINED_EARNINGS'
  | 'RESERVES'
  | 'OWNER_CONTRIBUTION'
  | 'DIVIDEND'
  | 'PROFIT_TRANSFER'
  | 'LOSS_TRANSFER'
  | 'OTHER';

@Entity('equity_entries')
export class EquityEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  entryNo!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'varchar' })
  type!: EquityType;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount!: number;

  @Column({ default: 'AED' })
  currency!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @Column({ nullable: true })
  referenceNo?: string;

  @Column({ nullable: true, type: 'uuid' })
  linkedCashAccountId?: string;

  @Column({ nullable: true })
  documentUrl?: string;

  @Column({ nullable: true })
  notes?: string;

  @Column({ type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
