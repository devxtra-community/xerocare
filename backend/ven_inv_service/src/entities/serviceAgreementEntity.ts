import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AgreementType {
  FSMA = 'FSMA',
  SMA = 'SMA',
  AMC = 'AMC',
}

@Entity('service_agreements')
export class ServiceAgreement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  customerId!: string;

  @Column({ type: 'uuid' })
  productId!: string;

  @Column({
    type: 'enum',
    enum: AgreementType,
    enumName: 'service_agreements_agreementtype_enum',
  })
  agreementType!: AgreementType;

  @Column({ type: 'timestamp' })
  startDate!: Date;

  @Column({ type: 'timestamp' })
  endDate!: Date;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
