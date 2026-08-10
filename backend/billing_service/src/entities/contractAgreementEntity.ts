import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('contract_agreements')
export class ContractAgreement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  agreementNumber!: string; // CA-YYYY-NNN

  @Index()
  @Column({ type: 'uuid' })
  invoiceId!: string;

  @Index()
  @Column({ type: 'uuid' })
  branchId!: string;

  // Contract date
  @Column({ type: 'date' })
  contractDate!: Date;

  // Customer info snapshot
  @Column({ type: 'varchar' })
  customerName!: string;

  @Column({ type: 'varchar', nullable: true })
  customerAddress?: string;

  @Column({ type: 'varchar', nullable: true })
  customerPhone?: string;

  @Column({ type: 'varchar', nullable: true })
  customerEmail?: string;

  @Column({ type: 'varchar', nullable: true })
  customerVatNumber?: string;

  // Employee / dealer info snapshot
  @Column({ type: 'uuid' })
  createdByEmployeeId!: string;

  @Column({ type: 'varchar' })
  createdByEmployeeName!: string;

  // Branch / dealer info snapshot
  @Column({ type: 'varchar' })
  dealerName!: string; // branch name

  @Column({ type: 'varchar', nullable: true })
  dealerAddress?: string;

  @Column({ type: 'varchar', nullable: true })
  dealerPhone?: string;

  // Signatures
  @Column({ type: 'text', nullable: true })
  employeeSignatureData?: string; // base64 PNG data URI

  @Column({ type: 'uuid', nullable: true })
  employeeSignedById?: string;

  @Column({ type: 'varchar', nullable: true })
  employeeSignedByName?: string;

  @Column({ type: 'timestamp', nullable: true })
  employeeSignedAt?: Date;

  @Column({ type: 'text', nullable: true })
  customerSignatureData?: string; // base64 PNG data URI

  @Column({ type: 'varchar', nullable: true })
  customerSignedDocumentUrl?: string; // R2 URL of uploaded signed agreement (UPLOAD method)

  @Column({ type: 'text', nullable: true })
  customerSignedDocumentNote?: string; // required attestation note for UPLOAD method

  @Column({ type: 'varchar', nullable: true, default: 'IN_PERSON' })
  customerSignedMethod?: string; // IN_PERSON | REMOTE | UPLOAD

  @Column({ type: 'varchar', nullable: true })
  customerSignedByName?: string;

  @Column({ type: 'timestamp', nullable: true })
  customerSignedAt?: Date;

  // Remote signing token (null when not requested)
  @Column({ type: 'varchar', nullable: true, unique: true })
  signingToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  signingTokenExpiresAt?: Date;

  @Column({ type: 'boolean', default: false })
  signingTokenUsed!: boolean;

  // Signature status
  @Column({ type: 'varchar', default: 'PENDING_SIGNATURES' })
  signatureStatus!: string; // PENDING_SIGNATURES | EMPLOYEE_SIGNED | CUSTOMER_SIGNED | FULLY_SIGNED

  // Terms text snapshot
  @Column({ type: 'text', nullable: true })
  termsAndConditions?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
