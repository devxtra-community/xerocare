import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * One asset's depreciation charge for one posted period.
 *
 * These lines are the single source of truth for accumulated depreciation. Before them,
 * the Balance Sheet re-derived accumulated depreciation from a formula on elapsed time
 * while the P&L took it from posted journals — two independent numbers for the same
 * thing. The asset side depreciated whether or not anything was posted, so the two never
 * agreed, and posting a period made Assets = Liabilities + Equity drift further apart by
 * exactly that period's charge.
 *
 * Reading accumulated depreciation from what was actually posted makes the two sides move
 * together: posting debits Depreciation Expense (equity down) and credits Accumulated
 * Depreciation (assets down) by one and the same figure.
 *
 * Keeping it per asset, rather than a running total on the asset row, means the register
 * can be rebuilt from the journals and cannot drift out of step with them.
 */
@Entity('depreciation_journal_lines')
@Index(['assetId'])
@Index(['journalId'])
export class DepreciationJournalLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  journalId!: string;

  @Column({ type: 'uuid' })
  assetId!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @Column({ type: 'int' })
  periodYear!: number;

  @Column({ type: 'int' })
  periodMonth!: number;

  /** The charge for this asset in this period. */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  /** Accumulated depreciation before and after this line, snapshotted so a period can be
   *  audited without replaying every earlier one. */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  openingAccumulated!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  closingAccumulated!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
