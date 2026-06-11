import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ServiceContractType {
  FSMA = 'FSMA',
  SMA = 'SMA',
  AMC = 'AMC',
}

@Entity('service_contracts')
export class ServiceContract {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  productId!: string;

  @Column({ type: 'uuid' })
  customerId!: string;

  @Column({
    type: 'enum',
    enum: ServiceContractType,
    enumName: 'service_contracts_contracttype_enum',
  })
  contractType!: ServiceContractType;

  @Column({ type: 'timestamp' })
  startDate!: Date;

  @Column({ type: 'timestamp' })
  endDate!: Date;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  contractValue!: number;

  @Column({ type: 'jsonb', nullable: true })
  coverageRules!: {
    labour: boolean;
    consumables: boolean;
    travel: boolean;
    [key: string]: boolean;
  };

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
