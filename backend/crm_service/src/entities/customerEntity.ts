import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Not a real 'no VAT number' == 'exempt' assumption — see customerEntity.ts's
// vatStatus doc comment. REGISTERED/UNREGISTERED_STANDARD both charge standard
// VAT normally; only EXEMPT (a specific legal status) zeroes it.
export enum CustomerVatStatus {
  REGISTERED = 'REGISTERED',
  UNREGISTERED_STANDARD = 'UNREGISTERED_STANDARD',
  EXEMPT = 'EXEMPT',
}

// B2C is the safe default — keeps existing customers on retail pricing unless
// explicitly marked B2B. Stored on the customer record so quotation forms can
// pre-fill the transaction type, but always overridable per-quotation.
export enum CustomerType {
  B2B = 'B2B',
  B2C = 'B2C',
}

export enum CustomerExemptionReason {
  GOVERNMENT_ORGANIZATION = 'GOVERNMENT_ORGANIZATION',
  EMBASSY_OR_DIPLOMATIC_MISSION = 'EMBASSY_OR_DIPLOMATIC_MISSION',
  INTERNATIONAL_ORGANIZATION = 'INTERNATIONAL_ORGANIZATION',
  CHARITY_OR_NON_PROFIT = 'CHARITY_OR_NON_PROFIT',
  EDUCATIONAL_OR_HEALTHCARE_INSTITUTION = 'EDUCATIONAL_OR_HEALTHCARE_INSTITUTION',
  VALID_VAT_EXEMPTION_CERTIFICATE = 'VALID_VAT_EXEMPTION_CERTIFICATE',
}

export const CUSTOMER_EXEMPTION_REASON_LABELS: Record<CustomerExemptionReason, string> = {
  [CustomerExemptionReason.GOVERNMENT_ORGANIZATION]: 'Government Organization',
  [CustomerExemptionReason.EMBASSY_OR_DIPLOMATIC_MISSION]: 'Embassy or Diplomatic Mission',
  [CustomerExemptionReason.INTERNATIONAL_ORGANIZATION]: 'International Organization',
  [CustomerExemptionReason.CHARITY_OR_NON_PROFIT]: 'Charity or Non-Profit Organization',
  [CustomerExemptionReason.EDUCATIONAL_OR_HEALTHCARE_INSTITUTION]:
    'Educational or Healthcare Institution',
  [CustomerExemptionReason.VALID_VAT_EXEMPTION_CERTIFICATE]:
    'Customer with a Valid VAT Exemption Certificate',
};

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  @Index({ unique: true })
  email?: string;

  @Column({ nullable: true })
  @Index()
  phone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ name: 'vat_number', type: 'varchar', length: 50, nullable: true })
  vatNumber?: string | null;

  // Default UNREGISTERED_STANDARD (not REGISTERED, not EXEMPT) so adding this column
  // never silently changes tax behavior for any pre-existing customer — standard VAT
  // still applies unless a customer is explicitly marked EXEMPT.
  @Column({
    name: 'vat_status',
    type: 'varchar',
    length: 30,
    default: CustomerVatStatus.UNREGISTERED_STANDARD,
  })
  vatStatus!: CustomerVatStatus;

  // Internal-only — see Invoice/Quotation rendering: this must never be surfaced on
  // any customer-facing document, only in internal profile/audit views. Required
  // (validated in customerService.ts) when vatStatus === EXEMPT, null otherwise.
  @Column({ name: 'exemption_reason', type: 'varchar', length: 60, nullable: true })
  exemptionReason?: CustomerExemptionReason | null;

  // Default B2C — retail pricing applies unless the customer is explicitly B2B.
  @Column({ name: 'customer_type', type: 'varchar', length: 3, default: CustomerType.B2C })
  customerType!: CustomerType;

  @Column({ name: 'country', type: 'varchar', length: 2, nullable: true })
  country?: string | null;

  @Column({ name: 'state_province', type: 'varchar', length: 100, nullable: true })
  stateProvince?: string | null;

  @Column({ name: 'city', type: 'varchar', length: 100, nullable: true })
  city?: string | null;

  @Column({ name: 'bank_name', type: 'varchar', length: 100, nullable: true })
  bankName?: string | null;

  @Column({ name: 'bank_account_number', type: 'varchar', length: 50, nullable: true })
  bankAccountNumber?: string | null;

  @Column({ name: 'bank_accounts', type: 'jsonb', nullable: true, default: () => "'[]'" })
  bankAccounts?: {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    accountType?: 'Savings Account' | 'Current Account' | 'Business Account';
    routingNumber?: string;
    swiftCode?: string;
    /** Country-correct bank identifier: IFSC (India), IBAN (ISO 13616 countries),
     * or a generic bank code elsewhere. Field name kept as `iban` for storage
     * continuity with existing data. */
    iban?: string;
    address?: string;
    branch?: string;
    /** ISO2 country of the BANK itself — independent of the customer's own
     * country field — a customer may bank in a different country than they
     * reside/operate in. */
    bankCountry?: string;
    /** Currency this account is held/paid in — may differ from the branch's local
     * currency (e.g. a customer paying in USD for a purchase made in a SAR branch). */
    currency?: string;
    isPrimary?: boolean;
  }[];

  @Column({ default: true })
  isActive!: boolean;

  @Column({ name: 'branch_id', nullable: true })
  @Index()
  branch_id?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string | null;
}
