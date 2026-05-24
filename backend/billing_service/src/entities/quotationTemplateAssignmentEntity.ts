import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('quotation_template_assignments')
export class QuotationTemplateAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', nullable: false })
  templateId!: string;

  @Column({ type: 'varchar', nullable: false })
  employeeId!: string;

  @CreateDateColumn({ type: 'timestamp' })
  assignedAt!: Date;

  @Column({ type: 'varchar', nullable: false })
  assignedBy!: string;
}
