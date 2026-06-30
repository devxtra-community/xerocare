import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { Client } from 'pg';
dotenv.config();

import { Invoice } from '../entities/invoiceEntity';
import { InvoiceItem } from '../entities/invoiceItemEntity';
import { UsageRecord } from '../entities/usageRecordEntity';
import { ProductAllocation } from '../entities/productAllocationEntity';
import { ReturnCredit } from '../entities/returnCreditEntity';
import { PaymentLedger } from '../entities/paymentLedgerEntity';
import { QuotationTemplateAssignment } from '../entities/quotationTemplateAssignmentEntity';
import { InvoiceLedger } from '../entities/invoiceLedgerEntity';
import { PaymentTransaction } from '../entities/paymentTransactionEntity';
import { OpeningBalanceEntry } from '../entities/openingBalanceEntryEntity';

import { logger } from './logger';
import { UsageRecordItem } from '../entities/usageRecordItemEntity';
import { DeviceMeterReading } from '../entities/deviceMeterReadingEntity';
import { CreditNote } from '../entities/creditNoteEntity';
import { AuditLog } from '../entities/auditLogEntity';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
import { CashbookEntry } from '../entities/cashbookEntryEntity';
import { ExpenseEntry } from '../entities/expenseEntryEntity';
import { DepreciationBrandRule } from '../entities/depreciationBrandRuleEntity';
import { DepreciationModelRule } from '../entities/depreciationModelRuleEntity';
import { AssetDepreciationRegister } from '../entities/assetDepreciationRegisterEntity';
import { DepreciationJournalEntry } from '../entities/depreciationJournalEntryEntity';
import { ManualReceivable } from '../entities/manualReceivableEntity';
import { ReceivablePayment } from '../entities/receivablePaymentEntity';
import { ManualPayable } from '../entities/manualPayableEntity';
import { PayablePayment } from '../entities/payablePaymentEntity';
import { EquityEntry } from '../entities/equityEntryEntity';
import { ExchangeRate } from '../entities/exchangeRateEntity';
import { AccountReconciliation } from '../entities/accountReconciliationEntity';

export const Source = new DataSource({
  type: 'postgres',
  url: process.env.BILLING_DATABASE_URL,
  ssl: process.env.BILLING_DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
  synchronize: false, // Set to false to avoid automatic enum change errors
  logging: false,
  entities: [
    Invoice,
    InvoiceItem,
    UsageRecord,
    ProductAllocation,
    UsageRecordItem,
    DeviceMeterReading,
    ReturnCredit,
    CreditNote,
    PaymentLedger,
    QuotationTemplateAssignment,
    AuditLog,
    InvoiceLedger,
    PaymentTransaction,
    OpeningBalanceEntry,
    CashBankAccount,
    CashbookEntry,
    ExpenseEntry,
    DepreciationBrandRule,
    DepreciationModelRule,
    AssetDepreciationRegister,
    DepreciationJournalEntry,
    ManualReceivable,
    ReceivablePayment,
    ManualPayable,
    PayablePayment,
    EquityEntry,
    ExchangeRate,
    AccountReconciliation,
  ],
  poolSize: 1,
  extra: {
    max: 1,
    min: 0,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
    keepAlive: true,
  },
});

/**
 * Runs raw SQL statements before TypeORM initializes to fix and extend Postgres enums safely.
 */
async function runPreMigrations() {
  const client = new Client({
    connectionString: process.env.BILLING_DATABASE_URL,
    ssl: process.env.BILLING_DATABASE_URL?.includes('neon.tech')
      ? { rejectUnauthorized: false }
      : false,
  });

  await client.connect();

  try {
    // Drop the old broken enum type if it exists from failed TypeORM synchronize attempts
    await client.query(`DROP TYPE IF EXISTS invoices_status_enum_old CASCADE;`);

    // Ensure status enum type exists
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoices_status_enum') THEN
          CREATE TYPE invoices_status_enum AS ENUM (
            'DRAFT', 'SENT', 'CUSTOMER_ACCEPTED', 'CUSTOMER_REJECTED', 'EMPLOYEE_APPROVED',
            'WAITING_FINANCE_APPROVAL', 'FINANCE_APPROVED', 'FINANCE_REJECTED', 'ACTIVE_CONTRACT',
            'INVOICED', 'PAID', 'EXPIRED', 'CANCELLED', 'RETAKEN', 'SUPERSEDED', 'TEMPLATE', 'ASSIGNED'
          );
        END IF;
      END $$;
    `);

    // Ensure all status enum values are present in case the enum type existed but was missing new values
    const enumValues = [
      'TEMPLATE',
      'ASSIGNED',
      'CUSTOMER_ACCEPTED',
      'CUSTOMER_REJECTED',
      'EMPLOYEE_APPROVED',
      'WAITING_FINANCE_APPROVAL',
      'FINANCE_APPROVED',
      'FINANCE_REJECTED',
      'ACTIVE_CONTRACT',
      'INVOICED',
      'EXPIRED',
      'RETAKEN',
      'SUPERSEDED',
      'CANCELLED',
      'PAID',
      'DRAFT',
      'SENT',
    ];

    for (const val of enumValues) {
      try {
        await client.query(`ALTER TYPE invoices_status_enum ADD VALUE IF NOT EXISTS '${val}';`);
      } catch (err) {
        // If duplicate_object error is thrown (in case postgres version doesn't support IF NOT EXISTS fully or other db issue), ignore it
        logger.debug(`Skipped enum value ${val}: ${(err as Error).message}`);
      }
    }

    // Ensure new values exist in invoices_saletype_enum
    const saleTypeValues = ['PRODUCT_SALE', 'SPAREPART_SALE', 'SERVICE'];
    for (const val of saleTypeValues) {
      try {
        await client.query(`ALTER TYPE invoices_saletype_enum ADD VALUE IF NOT EXISTS '${val}';`);
      } catch (err) {
        logger.debug(`Skipped adding ${val} to invoices_saletype_enum: ${(err as Error).message}`);
      }
    }

    // Ensure billType enum exists
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoices_billtype_enum') THEN
          CREATE TYPE invoices_billtype_enum AS ENUM ('SERVICE', 'AMC', 'FSMA', 'SMA', 'SALE', 'RENT', 'LEASE');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoices_warrantytype_enum') THEN
          CREATE TYPE invoices_warrantytype_enum AS ENUM ('none', 'duration', 'copies');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoices_warrantydurationunit_enum') THEN
          CREATE TYPE invoices_warrantydurationunit_enum AS ENUM ('months', 'years');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_note_status_enum') THEN
          CREATE TYPE credit_note_status_enum AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'PRODUCT_REPLACED');
        END IF;

        ALTER TYPE credit_note_status_enum ADD VALUE IF NOT EXISTS 'PRODUCT_REPLACED';

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_note_type_enum') THEN
          CREATE TYPE credit_note_type_enum AS ENUM ('DIRECT_REFUND', 'REPLACEMENT', 'CREDIT_EXCHANGE');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'damage_reason_enum') THEN
          CREATE TYPE damage_reason_enum AS ENUM ('Damaged Product', 'Incomplete Parts', 'Defective', 'Wrong Item Delivered', 'Other');
        END IF;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Ensure columns exist on invoices and invoice_items tables
    try {
      await client.query(`
        ALTER TABLE invoices 
        ADD COLUMN IF NOT EXISTS "billType" invoices_billtype_enum NULL,
        ADD COLUMN IF NOT EXISTS "serviceTicketId" UUID NULL,
        ADD COLUMN IF NOT EXISTS "maxCopyLimit" INTEGER NULL,
        ADD COLUMN IF NOT EXISTS "warrantyType" invoices_warrantytype_enum NOT NULL DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS "warrantyDurationValue" INTEGER NULL,
        ADD COLUMN IF NOT EXISTS "warrantyDurationUnit" invoices_warrantydurationunit_enum NULL,
        ADD COLUMN IF NOT EXISTS "warrantyCopyLimit" INTEGER NULL,
        ADD COLUMN IF NOT EXISTS "warrantyEmailSent" BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "warrantyExpiryEmailSent" BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      await client.query(`
        ALTER TABLE invoice_items 
        ADD COLUMN IF NOT EXISTS warranty VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(12, 2) DEFAULT 0;
      `);
      logger.info(
        'Guaranteed billType, serviceTicketId, maxCopyLimit, and service estimate validity columns exist on invoices table, and warranty column exists on invoice_items table.',
      );

      // Create new ledger/payment tables if not exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS invoice_ledger (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
            total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS payment_transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
            transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            payment_mode VARCHAR(50) NOT NULL,
            reference_number VARCHAR(100),
            amount DECIMAL(12,2) NOT NULL,
            recorded_by UUID,
            remarks TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Ensure invoices_type_enum has OPENING
      try {
        await client.query(`ALTER TYPE invoices_type_enum ADD VALUE IF NOT EXISTS 'OPENING';`);
      } catch (err) {
        logger.debug(`Skipped adding OPENING to invoices_type_enum: ${(err as Error).message}`);
      }

      // Add columns to invoices table
      await client.query(`
        ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS is_opening_entry BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
      `);

      // --- Multi-Currency & Tax columns on invoices ---
      await client.query(`
        ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3),
        ADD COLUMN IF NOT EXISTS exchange_rate_snapshot DECIMAL(18,6),
        ADD COLUMN IF NOT EXISTS tax_name VARCHAR(50),
        ADD COLUMN IF NOT EXISTS tax_percent DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2),
        ADD COLUMN IF NOT EXISTS tax_registration_number VARCHAR(50);
      `);

      // --- Currency column on payment_transactions ---
      await client.query(`
        ALTER TABLE payment_transactions
        ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3);
      `);

      // --- Quotation validity + service estimate columns ---
      await client.query(`
        ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS "validityDays" INTEGER NULL,
        ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS "isConverted" BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "estimateValidUntil" TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS "estimateExpired" BOOLEAN NULL,
        ADD COLUMN IF NOT EXISTS "visitChargeAmount" DECIMAL(12,2) NULL,
        ADD COLUMN IF NOT EXISTS "visitChargeMethod" VARCHAR(100) NULL,
        ADD COLUMN IF NOT EXISTS "totalDiscountAmount" DECIMAL(12,2) NULL,
        ADD COLUMN IF NOT EXISTS "technicianNoteToFinance" TEXT NULL,
        ADD COLUMN IF NOT EXISTS "revisionCount" INTEGER NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "validityExtensionDays" INTEGER NULL,
        ADD COLUMN IF NOT EXISTS "validityExtensionFee" DECIMAL(12,2) NULL,
        ADD COLUMN IF NOT EXISTS "validityExtensionFeeAdded" BOOLEAN NOT NULL DEFAULT FALSE;
      `);

      // Add columns to invoice_ledger table
      await client.query(`
        ALTER TABLE invoice_ledger 
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
      `);

      // Ensure opening_balance_entries_balance_type_enum exists
      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'opening_balance_entries_balance_type_enum') THEN
            CREATE TYPE opening_balance_entries_balance_type_enum AS ENUM (
              'SALE_OUTSTANDING', 'RENT_CONTRACT', 'LEASE_CONTRACT', 'SERVICE_DEBT', 'OTHER_DEBT'
            );
          END IF;
        END $$;
      `);

      // Create opening_balance_entries table
      await client.query(`
        CREATE TABLE IF NOT EXISTS opening_balance_entries (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            entry_number VARCHAR(255) UNIQUE NOT NULL,
            customer_id VARCHAR(255) NOT NULL,
            branch_id UUID NOT NULL,
            balance_type opening_balance_entries_balance_type_enum NOT NULL,
            opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
            remaining_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
            original_total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            already_paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
            is_fully_settled BOOLEAN NOT NULL DEFAULT FALSE,
            migrated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            monthly_billing_amount DECIMAL(12,2) NULL,
            billing_cycle_in_days INTEGER NULL DEFAULT 30,
            next_payment_due_date DATE NULL,
            total_contract_months INTEGER NULL,
            months_completed INTEGER NULL,
            months_remaining INTEGER NULL,
            remaining_contract_value DECIMAL(12,2) NULL,
            contract_start_date DATE NULL,
            product_brand VARCHAR(255) NULL,
            product_model VARCHAR(255) NULL,
            serial_number VARCHAR(255) NULL,
            product_id VARCHAR(255) NULL,
            notes TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP NULL
        );
      `);

      // Ensure branch_name column exists
      await client.query(`
        ALTER TABLE opening_balance_entries ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255) NULL;
      `);

      logger.info(
        'Guaranteed invoice_ledger, payment_transactions, and opening_balance_entries tables exist.',
      );
    } catch (colErr) {
      logger.warn('Failed to ensure invoices or invoice_items columns:', colErr);
    }
    // ─── Finance Accounts Module Tables ──────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS cash_bank_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        type VARCHAR NOT NULL,
        "bankName" VARCHAR,
        "accountNumber" VARCHAR,
        "branchId" UUID NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'AED',
        "openingBalance" DECIMAL(12,2) DEFAULT 0,
        "currentBalance" DECIMAL(12,2) DEFAULT 0,
        notes TEXT,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cashbook_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "referenceNo" VARCHAR UNIQUE NOT NULL,
        date DATE NOT NULL,
        "accountId" UUID REFERENCES cash_bank_accounts(id),
        "entryType" VARCHAR NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        category VARCHAR NOT NULL,
        description TEXT,
        "linkedInvoiceId" UUID,
        "linkedPoId" UUID,
        "linkedExpenseId" UUID,
        "paymentMode" VARCHAR,
        "chequeNo" VARCHAR,
        notes TEXT,
        "createdBy" UUID NOT NULL,
        "branchId" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS expense_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "expenseNo" VARCHAR UNIQUE NOT NULL,
        date DATE NOT NULL,
        category VARCHAR NOT NULL,
        "subCategory" VARCHAR,
        description TEXT NOT NULL,
        "branchId" UUID NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        "vatAmount" DECIMAL(12,2) DEFAULT 0,
        "netAmount" DECIMAL(12,2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'AED',
        status VARCHAR DEFAULT 'PENDING',
        "paidFrom" UUID REFERENCES cash_bank_accounts(id),
        "paymentDate" DATE,
        "paymentMode" VARCHAR,
        "referenceNo" VARCHAR,
        "approvedBy" UUID,
        "receiptUrl" VARCHAR,
        notes TEXT,
        "createdBy" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS depreciation_brand_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "brandId" UUID NOT NULL UNIQUE,
        "annualDepreciationPct" DECIMAL(5,2) NOT NULL,
        "usefulLifeMonths" INTEGER NOT NULL DEFAULT 60,
        "salvageValuePct" DECIMAL(5,2) NOT NULL DEFAULT 10,
        method VARCHAR NOT NULL DEFAULT 'STRAIGHT_LINE',
        notes TEXT,
        "createdBy" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS depreciation_model_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "brandId" UUID NOT NULL,
        "modelId" UUID NOT NULL UNIQUE,
        "annualDepreciationPct" DECIMAL(5,2) NOT NULL,
        "usefulLifeMonths" INTEGER NOT NULL DEFAULT 60,
        "salvageValuePct" DECIMAL(5,2) NOT NULL DEFAULT 10,
        method VARCHAR NOT NULL DEFAULT 'STRAIGHT_LINE',
        notes TEXT,
        "createdBy" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS asset_depreciation_register (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "productId" UUID NOT NULL UNIQUE,
        "brandId" UUID NOT NULL,
        "modelId" UUID NOT NULL,
        "branchId" UUID NOT NULL,
        "purchaseDate" DATE NOT NULL,
        "purchasePrice" DECIMAL(12,2) NOT NULL,
        "annualDepreciationPct" DECIMAL(5,2) NOT NULL,
        "usefulLifeMonths" INTEGER NOT NULL,
        "salvageValuePct" DECIMAL(5,2) NOT NULL,
        "salvageValue" DECIMAL(12,2) NOT NULL,
        method VARCHAR NOT NULL DEFAULT 'STRAIGHT_LINE',
        status VARCHAR NOT NULL DEFAULT 'ACTIVE',
        "disposalDate" DATE,
        "disposalValue" DECIMAL(12,2),
        notes TEXT,
        "createdBy" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS depreciation_journal_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "periodYear" INTEGER NOT NULL,
        "periodMonth" INTEGER NOT NULL,
        "totalAmount" DECIMAL(12,2) NOT NULL,
        "branchId" UUID NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'PENDING',
        "postedBy" UUID,
        "postedAt" TIMESTAMP,
        "expenseEntryId" UUID REFERENCES expense_entries(id),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE("periodYear", "periodMonth", "branchId")
      );

      CREATE TABLE IF NOT EXISTS manual_receivables (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "referenceNo" VARCHAR UNIQUE NOT NULL,
        type VARCHAR NOT NULL,
        "customerId" UUID,
        "customerName" VARCHAR,
        description TEXT,
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'AED',
        "issueDate" DATE NOT NULL,
        "dueDate" DATE NOT NULL,
        "amountPaid" DECIMAL(12,2) DEFAULT 0,
        outstanding DECIMAL(12,2),
        status VARCHAR DEFAULT 'PENDING',
        "linkedInvoiceId" UUID,
        "branchId" UUID NOT NULL,
        notes TEXT,
        "createdBy" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS receivable_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "receivableId" UUID REFERENCES manual_receivables(id),
        "paymentDate" DATE NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        "paidToAccount" UUID REFERENCES cash_bank_accounts(id),
        "paymentMode" VARCHAR,
        "referenceNo" VARCHAR,
        notes TEXT,
        "createdBy" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS manual_payables (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "referenceNo" VARCHAR UNIQUE NOT NULL,
        type VARCHAR NOT NULL,
        "payableTo" VARCHAR NOT NULL,
        "vendorId" UUID,
        "employeeId" UUID,
        description TEXT,
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'AED',
        "issueDate" DATE NOT NULL,
        "dueDate" DATE NOT NULL,
        "amountPaid" DECIMAL(12,2) DEFAULT 0,
        outstanding DECIMAL(12,2),
        status VARCHAR DEFAULT 'PENDING',
        "branchId" UUID NOT NULL,
        notes TEXT,
        "createdBy" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payable_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "payableId" UUID REFERENCES manual_payables(id),
        "paymentDate" DATE NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        "paidFromAccount" UUID REFERENCES cash_bank_accounts(id),
        "paymentMode" VARCHAR,
        "referenceNo" VARCHAR,
        notes TEXT,
        "createdBy" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS exchange_rates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "fromCurrency" VARCHAR(3) NOT NULL,
        "toCurrency" VARCHAR(3) NOT NULL,
        rate DECIMAL(12,6) NOT NULL,
        "setBy" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE("fromCurrency", "toCurrency")
      );

      CREATE TABLE IF NOT EXISTS equity_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "entryNo" VARCHAR UNIQUE NOT NULL,
        date DATE NOT NULL,
        type VARCHAR NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(14,2) NOT NULL,
        currency VARCHAR DEFAULT 'AED',
        "branchId" UUID NOT NULL,
        "referenceNo" VARCHAR,
        "linkedCashAccountId" UUID REFERENCES cash_bank_accounts(id),
        "documentUrl" VARCHAR,
        notes TEXT,
        "createdBy" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    logger.info('Finance accounts module tables created/verified.');

    // ─── Cash & Bank extended columns + reconciliation table ─────────────────
    await client.query(`
      ALTER TABLE cash_bank_accounts
        ADD COLUMN IF NOT EXISTS iban VARCHAR,
        ADD COLUMN IF NOT EXISTS "accountType" VARCHAR DEFAULT 'CURRENT',
        ADD COLUMN IF NOT EXISTS "openingDate" DATE,
        ADD COLUMN IF NOT EXISTS "responsiblePersonId" UUID,
        ADD COLUMN IF NOT EXISTS "contactPerson" VARCHAR;

      CREATE TABLE IF NOT EXISTS account_reconciliations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "accountId" UUID NOT NULL REFERENCES cash_bank_accounts(id) ON DELETE CASCADE,
        "reconciliationDate" DATE NOT NULL,
        "statementDate" DATE NOT NULL,
        "bookBalance" DECIMAL(12,2) NOT NULL,
        "statementBalance" DECIMAL(12,2) NOT NULL,
        difference DECIMAL(12,2) NOT NULL,
        "isBalanced" BOOLEAN NOT NULL DEFAULT FALSE,
        notes TEXT,
        "createdBy" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    logger.info('Cash & Bank extended schema applied.');
    // ─────────────────────────────────────────────────────────────────────────

    logger.info('Pre-migration enum values and tables added successfully');

    // Run legacy status updates
    logger.info('Running pre-migration legacy status updates...');
    try {
      await client.query(
        `UPDATE invoices SET status = 'ACTIVE_CONTRACT' WHERE status = 'ACTIVE_LEASE';`,
      );
      await client.query(
        `UPDATE invoices SET status = 'FINANCE_APPROVED' WHERE status = 'APPROVED';`,
      );
      await client.query(
        `UPDATE invoices SET status = 'PAID' WHERE status = 'TRANSACTION_COMPLETED';`,
      );
      await client.query(`UPDATE invoices SET status = 'SENT' WHERE status = 'SENT_TO_CUSTOMER';`);
      await client.query(`UPDATE invoices SET status = 'INVOICED' WHERE status = 'ISSUED';`);
      await client.query(
        `UPDATE invoices SET status = 'CUSTOMER_ACCEPTED' WHERE status = 'ACCEPTED';`,
      );
      await client.query(
        `UPDATE invoices SET status = 'CUSTOMER_REJECTED' WHERE status = 'REJECTED';`,
      );
      logger.info('Pre-migration legacy status updates completed.');
    } catch (err) {
      logger.warn(
        'Failed to update legacy status values (invoices table might not exist yet):',
        err,
      );
    }
  } catch (err) {
    logger.error('Failed to run pre-migrations:', err);
    throw err;
  } finally {
    await client.end();
  }
}

/**
 * Connects to the database with native exponential backoff retry logic.
 */
export const connectWithRetry = async (initialDelayMs = 2000): Promise<DataSource> => {
  let attempt = 1;
  let delay = initialDelayMs;

  while (true) {
    try {
      if (!Source.isInitialized) {
        logger.info(`Attempting database connection (Attempt ${attempt})...`);
        await runPreMigrations();
        await Source.initialize();
        logger.info('Database connected successfully.');

        // Reconcile customerId column to be nullable
        logger.info('Ensuring customerId column is nullable...');
        await Source.query(`ALTER TABLE invoices ALTER COLUMN "customerId" DROP NOT NULL;`);
        logger.info('customerId column is now nullable.');
      }
      return Source;
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      logger.error(
        `Database connection failed on attempt ${attempt}: ${err.code} - ${err.message}`,
        err,
      );

      logger.info(`Waiting ${delay / 1000} seconds before retrying...`);
      await new Promise((resolve) => setTimeout(resolve, delay));

      attempt++;
      delay = Math.min(delay * 2, 30000);
    }
  }
};
