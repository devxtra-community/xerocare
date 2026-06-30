import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('exchange_rates')
@Unique(['fromCurrency', 'toCurrency'])
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 3 })
  fromCurrency!: string;

  @Column({ length: 3 })
  toCurrency!: string;

  @Column({ type: 'decimal', precision: 12, scale: 6 })
  rate!: number;

  @Column({ type: 'uuid' })
  setBy!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
