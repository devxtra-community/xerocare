import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// Owners/Shareholders/Partners, scoped to the branch they were entered against.
//
// These were originally company-wide, on the reasoning that one legal entity operates
// several branches. In practice each branch keeps its own books and its own contributors:
// a contributor added in Branch A was appearing in Branch B's Equity and Opening Balance
// forms, where somebody could post a contribution against an owner belonging to another
// branch entirely.
//
// branchId is nullable only for rows that pre-date the change and could not be attributed
// to a single branch from their equity history — see the backfill in dataSource.ts.
@Entity('owners')
export class Owner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  /** Branch this owner belongs to. Null only on legacy rows that could not be attributed;
   *  those stay visible everywhere so no existing record becomes unreachable. */
  @Column({ type: 'uuid', nullable: true })
  branchId?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  // Informational cap-table figure — not enforced to sum to 100 across owners,
  // since partial/unknown ownership records are still useful to keep.
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  ownershipPercent?: number;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
