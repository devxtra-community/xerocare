import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// Owners/Shareholders/Partners are a company-wide concept (this is one legal
// entity operating multiple branches, not separate businesses per branch) —
// deliberately not branchId-scoped, unlike most other entities in this file.
@Entity('owners')
export class Owner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

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
