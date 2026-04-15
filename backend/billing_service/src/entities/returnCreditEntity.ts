import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Invoice } from './invoiceEntity';

@Entity('return_credits')
export class ReturnCredit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'invoice_id', type: 'uuid' })
  @Index()
  invoiceId!: string;

  @ManyToOne(() => Invoice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice!: Invoice;

  @Column()
  @Index()
  branchId!: string;

  @Column()
  createdBy!: string; // employeeId

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'uuid', nullable: true })
  returnedItemId?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  returnedItemType?: 'PRODUCT' | 'SPARE_PART';

  @CreateDateColumn()
  createdAt!: Date;
}
