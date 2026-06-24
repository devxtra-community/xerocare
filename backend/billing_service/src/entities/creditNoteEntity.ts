import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Invoice } from './invoiceEntity';
import { CreditNoteStatus } from './enums/creditNoteStatus';
import { CreditNoteType } from './enums/creditNoteType';
import { DamageReason } from './enums/damageReason';

@Entity('credit_notes')
export class CreditNote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  creditNoteNo!: string;

  @Column({ name: 'invoice_id', type: 'uuid' })
  @Index()
  invoiceId!: string;

  @ManyToOne(() => Invoice)
  @JoinColumn({ name: 'invoice_id' })
  invoice!: Invoice;

  @Column({ nullable: true })
  @Index()
  invoiceNumber!: string;

  @Column({ type: 'uuid' })
  @Index()
  customerId!: string;

  @Column({ nullable: true })
  @Index()
  customerName!: string;

  @Column({ type: 'uuid' })
  @Index()
  branchId!: string;

  @Column({ type: 'uuid' })
  @Index()
  productId!: string;

  @Column()
  productName!: string;

  @Column()
  modelName!: string;

  @Column()
  brand!: string;

  @Column({ type: 'varchar', nullable: true })
  serialNumber?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  productAmount!: number;

  @Column({
    type: 'enum',
    enum: CreditNoteType,
  })
  type!: CreditNoteType;

  @Column({
    type: 'enum',
    enum: CreditNoteStatus,
    default: CreditNoteStatus.DRAFT,
  })
  @Index()
  status!: CreditNoteStatus;

  @Column({ type: 'uuid' })
  sellerEmployeeId!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true })
  financeNote?: string;

  @Column({
    type: 'enum',
    enum: DamageReason,
    nullable: true,
  })
  damageReason?: DamageReason;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ type: 'uuid', nullable: true })
  replacementProductId?: string;

  @Column({ type: 'varchar', nullable: true })
  replacementProductName?: string;

  @Column({ type: 'varchar', nullable: true })
  replacementSerialNumber?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  replacementAmount?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  replacementDiscount: number = 0;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
