import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Lot } from './lotEntity';

// Shipping/customs paperwork that travels with a lot — bill of lading,
// customs declaration, commercial invoice, etc. Kept indefinitely (some
// jurisdictions require these on file for years), so there is no delete
// path for non-admins.
export enum LotDocumentType {
  BILL_OF_LADING = 'BILL_OF_LADING',
  CUSTOMS_DECLARATION = 'CUSTOMS_DECLARATION',
  COMMERCIAL_INVOICE = 'COMMERCIAL_INVOICE',
  PACKING_LIST = 'PACKING_LIST',
  INSURANCE_CERTIFICATE = 'INSURANCE_CERTIFICATE',
  OTHER = 'OTHER',
}

@Entity('lot_documents')
export class LotDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'lot_id', type: 'uuid' })
  @Index()
  lotId!: string;

  @ManyToOne(() => Lot, (lot) => lot.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lot_id' })
  lot!: Lot;

  @Column({
    name: 'document_type',
    type: 'enum',
    enum: LotDocumentType,
    default: LotDocumentType.OTHER,
  })
  documentType!: LotDocumentType;

  // User-given label (e.g. "Bill of Lading - Container XYZ4521") — distinct from
  // the uploaded file's own name, which is often a meaningless scan filename.
  @Column({ name: 'document_name', type: 'varchar', length: 255 })
  documentName!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'file_url', type: 'varchar', length: 1000 })
  fileUrl!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 500 })
  fileName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 150, nullable: true })
  mimeType?: string;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize?: number;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
