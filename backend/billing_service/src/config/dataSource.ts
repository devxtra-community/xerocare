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
import { Owner } from '../entities/ownerEntity';
import { ExchangeRate } from '../entities/exchangeRateEntity';
import { AccountReconciliation } from '../entities/accountReconciliationEntity';
import { EmployeeTarget } from '../entities/employeeTargetEntity';
import { EmployeeTargetAchievement } from '../entities/employeeTargetAchievementEntity';
import { EmployeeExpenseRequest } from '../entities/employeeExpenseRequestEntity';
import { Cheque } from '../entities/chequeEntity';
import { ChequeStatusHistory } from '../entities/chequeStatusHistoryEntity';
import { CountryTaxRule } from '../entities/countryTaxRuleEntity';
import { GuaranteeCheque } from '../entities/guaranteeChequeEntity';
import { VatRemittance } from '../entities/vatRemittanceEntity';
import { ChartOfAccount } from '../entities/chartOfAccountEntity';
import { IncomeEntry } from '../entities/incomeEntryEntity';
import { ManualJournalEntry } from '../entities/manualJournalEntryEntity';
import { ContractAgreement } from '../entities/contractAgreementEntity';
import { InstallationRequest } from '../entities/installationRequestEntity';
import { SalePaymentRequest } from '../entities/salePaymentRequestEntity';
import { MachineSwapRequest } from '../entities/machineSwapRequestEntity';

// Overridable so a constrained Postgres plan can be capped without a code change.
const BILLING_DB_POOL_MAX = Number(process.env.BILLING_DB_POOL_MAX) || 15;

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
    Owner,
    ExchangeRate,
    AccountReconciliation,
    EmployeeTarget,
    EmployeeTargetAchievement,
    EmployeeExpenseRequest,
    Cheque,
    ChequeStatusHistory,
    CountryTaxRule,
    GuaranteeCheque,
    VatRemittance,
    ChartOfAccount,
    IncomeEntry,
    ManualJournalEntry,
    ContractAgreement,
    InstallationRequest,
    SalePaymentRequest,
    MachineSwapRequest,
  ],
  // Reporting endpoints (chart-of-accounts, balance sheet, segmented P&L) fan out
  // 50+ independent queries through Promise.all. A pool of 1 serialized them all and
  // anything still queued when connectionTimeoutMillis expired failed with
  // "timeout exceeded when trying to connect" — a 500 on every chart-of-accounts load.
  // NOTE: TypeORM's pg driver spreads `extra` over its own defaults, so `extra.max`
  // overrides `poolSize` — both are set to the same value to avoid confusion.
  poolSize: BILLING_DB_POOL_MAX,
  extra: {
    max: BILLING_DB_POOL_MAX,
    min: 0,
    idleTimeoutMillis: 30000,
    // Time to WAIT FOR A FREE POOL SLOT, not the TCP connect time. Must comfortably
    // exceed the slowest query times the fan-out depth, or queued queries get killed
    // while the pool is healthy.
    connectionTimeoutMillis: 30000,
    statement_timeout: 30000,
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
    // Fresh database (no invoices table yet): skip all legacy fixes. The schema is
    // created from entities via Source.synchronize() in connectWithRetry, after which
    // pre-migrations run again to apply the raw-SQL extras.
    const freshCheck = await client.query(`SELECT to_regclass('public.invoices') AS tbl;`);
    if (!freshCheck.rows[0].tbl) {
      logger.info('Fresh database detected (no invoices table) — skipping pre-migrations.');
      return;
    }

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

    // Rent/Lease Accessories: a real priced line item (stand, tray, stapler unit, etc.)
    // supplied alongside the metered machine, billed once with the first month advance —
    // distinct from ItemType.PRODUCT (the machine itself, always 0-priced on Rent/Lease).
    try {
      await client.query(
        `ALTER TYPE invoice_items_itemtype_enum ADD VALUE IF NOT EXISTS 'ACCESSORY';`,
      );
    } catch (err) {
      logger.debug(
        `Skipped adding 'ACCESSORY' to invoice_items_itemtype_enum: ${(err as Error).message}`,
      );
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

    // Extend warrantytype enum with 'both' (must be outside DO block — PG restriction on DDL in transactions)
    try {
      await client.query(`ALTER TYPE invoices_warrantytype_enum ADD VALUE IF NOT EXISTS 'both';`);
    } catch (err) {
      logger.debug(
        `Skipped adding 'both' to invoices_warrantytype_enum: ${(err as Error).message}`,
      );
    }

    // Ensure columns exist on invoices and invoice_items tables
    try {
      await client.query(`
        ALTER TABLE invoices 
        ADD COLUMN IF NOT EXISTS "billType" invoices_billtype_enum NULL,
        ADD COLUMN IF NOT EXISTS "serviceTicketId" UUID NULL,
        ADD COLUMN IF NOT EXISTS "serviceContractId" UUID NULL,
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
        ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(12, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "separateA3Pricing" BOOLEAN NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "bwA3ExcessRate" DECIMAL(10, 4) NULL,
        ADD COLUMN IF NOT EXISTS "colorA3ExcessRate" DECIMAL(10, 4) NULL;
      `);
      logger.info(
        'Guaranteed billType, serviceTicketId, maxCopyLimit, and service estimate validity columns exist on invoices table, and warranty column exists on invoice_items table.',
      );

      // Create new ledger/payment tables if not exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS payment_ledgers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "invoiceId" UUID REFERENCES invoices(id) ON DELETE CASCADE,
            "amountPaid" DECIMAL(12,2) NOT NULL,
            "paymentMode" VARCHAR(50) NOT NULL,
            "paymentDate" DATE NOT NULL,
            "referenceNumber" VARCHAR(255),
            remarks TEXT,
            "receiptUrl" VARCHAR(255),
            "recordedBy" VARCHAR(255) NOT NULL,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

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

      // Prevents the same physical machine being ALLOCATED to two contracts at
      // once under concurrent allocateMachines calls (app-level checks only
      // guard against a retry of the *same* contract). Isolated in its own
      // try/catch since it will fail to create if pre-existing prod data
      // already has duplicate active allocations for one productId — that
      // needs a manual data cleanup, not a boot-time crash.
      try {
        await client.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS "uniq_product_allocation_active"
            ON product_allocations ("productId")
            WHERE "productId" IS NOT NULL AND status = 'ALLOCATED';
        `);
      } catch (err) {
        logger.warn(
          `Could not create uniq_product_allocation_active index — likely pre-existing duplicate ` +
            `ALLOCATED rows for the same productId need manual cleanup first: ${(err as Error).message}`,
        );
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

      // --- Exchange rate snapshot on payment_transactions (Part 4: dual-currency
      // display for payments made from a customer bank account in a currency other
      // than the invoice's own — rate captured at payment time, same convention as
      // invoices.exchange_rate_snapshot / purchases.exchange_rate) ---
      await client.query(`
        ALTER TABLE payment_transactions
        ADD COLUMN IF NOT EXISTS exchange_rate_snapshot DECIMAL(18,6);
      `);

      // --- Customer snapshot location columns ---
      await client.query(`
        ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS customer_country VARCHAR(100) NULL,
        ADD COLUMN IF NOT EXISTS customer_state_province VARCHAR(100) NULL;
      `);

      // --- A3 click multiplier (contract-configurable, was hardcoded *2) ---
      await client.query(`
        ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS a3_multiplier DECIMAL(4,2) NOT NULL DEFAULT 2.00;
      `);

      // --- Quotation validity + service estimate columns ---
      await client.query(`
        ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS validity_days INTEGER NOT NULL DEFAULT 30,
        ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS is_converted BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS estimate_valid_until TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS estimate_expired BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS visit_charge_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS visit_charge_method VARCHAR(30) NULL,
        ADD COLUMN IF NOT EXISTS total_discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS technician_note_to_finance TEXT NULL,
        ADD COLUMN IF NOT EXISTS revision_count INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS validity_extension_days INTEGER NULL,
        ADD COLUMN IF NOT EXISTS validity_extension_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS validity_extension_fee_added BOOLEAN NOT NULL DEFAULT FALSE;
      `);

      // Add columns to invoice_ledger table
      await client.query(`
        ALTER TABLE invoice_ledger
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
      `);

      // A security deposit is refundable caution money, NOT settlement of anything the
      // customer owes — the receivable side already excludes it (SECURITY_DEPOSIT-type
      // usage_records never enter the billed sum), but its PaymentTransaction was still
      // counted on the paid side of every "what's still outstanding" query. That
      // asymmetry silently understated each contract's outstanding balance by exactly
      // the deposit amount. Flagging the transaction is what lets those queries drop it
      // without losing the deposit as an auditable receipt.
      await client.query(`
        ALTER TABLE payment_transactions
        ADD COLUMN IF NOT EXISTS is_security_deposit BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      // Backfill: deposits arrive either through the sale-payment-request workflow
      // (authoritative — isSecurityDeposit on the request that produced the txn) or
      // through the older direct-recording path, which only ever marked them by writing
      // 'Security Deposit' into remarks.
      await client.query(`
        UPDATE payment_transactions pt
        SET is_security_deposit = TRUE
        FROM sale_payment_requests spr
        WHERE spr."paymentTransactionId" = pt.id
          AND spr."isSecurityDeposit" = TRUE
          AND pt.is_security_deposit = FALSE;
      `);
      await client.query(`
        UPDATE payment_transactions
        SET is_security_deposit = TRUE
        WHERE is_security_deposit = FALSE
          AND LOWER(TRIM(COALESCE(remarks, ''))) = 'security deposit';
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

      // Create credit_notes table
      await client.query(`
        CREATE TABLE IF NOT EXISTS credit_notes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "creditNoteNo" VARCHAR(255) UNIQUE NOT NULL,
            invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
            "invoiceNumber" VARCHAR(255) NULL,
            "customerId" UUID NOT NULL,
            "customerName" VARCHAR(255) NULL,
            "branchId" UUID NOT NULL,
            "productId" UUID NULL,
            "productName" VARCHAR(255) NULL,
            "modelName" VARCHAR(255) NULL,
            brand VARCHAR(255) NULL,
            "serialNumber" VARCHAR(255) NULL,
            "productAmount" DECIMAL(12,2) NOT NULL,
            type credit_note_type_enum NOT NULL,
            status credit_note_status_enum NOT NULL DEFAULT 'DRAFT',
            "sellerEmployeeId" UUID NOT NULL,
            notes TEXT NULL,
            "financeNote" TEXT NULL,
            "damageReason" damage_reason_enum NULL,
            "rejectionReason" TEXT NULL,
            "replacementProductId" UUID NULL,
            "replacementProductName" VARCHAR(255) NULL,
            "replacementSerialNumber" VARCHAR(255) NULL,
            "replacementAmount" DECIMAL(12,2) NULL,
            "replacementDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Columns added to credit_notes after the table was first created
      // (spare-part returns, tax snapshot, refund payment mode).
      await client.query(`
        ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS item_category VARCHAR(20) NOT NULL DEFAULT 'PRODUCT';
        ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS "sparePartId" UUID NULL;
        ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS sku VARCHAR(255) NULL;
        ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS quantity INT NULL;
        ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS tax_name VARCHAR(50) NULL;
        ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS tax_percent DECIMAL(5,2) NULL;
        ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) NULL;
        ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS "paymentMode" VARCHAR(255) NULL;
        ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS "replacementSparePartId" UUID NULL;
        ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS "replacementSparePartName" VARCHAR(255) NULL;
        ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS "replacementSparePartSku" VARCHAR(255) NULL;
        ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS "replacementQuantity" INT NULL;
        -- Product fields are optional now that spare-part credit notes exist
        ALTER TABLE credit_notes ALTER COLUMN "productId" DROP NOT NULL;
        ALTER TABLE credit_notes ALTER COLUMN "productName" DROP NOT NULL;
        ALTER TABLE credit_notes ALTER COLUMN "modelName" DROP NOT NULL;
        ALTER TABLE credit_notes ALTER COLUMN brand DROP NOT NULL;
        CREATE INDEX IF NOT EXISTS "IDX_credit_notes_spare_part_id" ON credit_notes ("sparePartId");
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

      ALTER TABLE expense_entries
        ADD COLUMN IF NOT EXISTS "isPrepayment" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "coveredPeriodStart" DATE,
        ADD COLUMN IF NOT EXISTS "coveredPeriodEnd" DATE;

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
        "linkedPurchaseId" UUID,
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

    // owners: company-wide Owners/Shareholders/Partners reference list, and the
    // type-specific columns the dynamic Equity form needs (see ownerEntity.ts /
    // equityEntryEntity.ts for why each exists).
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS owners (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR NOT NULL,
          email VARCHAR,
          phone VARCHAR,
          "ownershipPercent" DECIMAL(5,2),
          "isActive" BOOLEAN DEFAULT true,
          notes TEXT,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        );

        ALTER TABLE equity_entries ADD COLUMN IF NOT EXISTS "ownerId" UUID NULL REFERENCES owners(id);
        ALTER TABLE equity_entries ADD COLUMN IF NOT EXISTS "paymentMode" VARCHAR NULL;
        ALTER TABLE equity_entries ADD COLUMN IF NOT EXISTS "numberOfShares" INT NULL;
        ALTER TABLE equity_entries ADD COLUMN IF NOT EXISTS "pricePerShare" DECIMAL(14,4) NULL;
        ALTER TABLE equity_entries ADD COLUMN IF NOT EXISTS "reserveType" VARCHAR NULL;
        ALTER TABLE equity_entries ADD COLUMN IF NOT EXISTS "reserveSource" VARCHAR NULL;
        ALTER TABLE equity_entries ADD COLUMN IF NOT EXISTS "paymentDate" DATE NULL;
      `);
      logger.info(
        'Guaranteed owners table exists, and equity_entries has its type-specific columns.',
      );
    } catch (ownerErr) {
      logger.warn('Failed to ensure owners table / equity_entries columns:', ownerErr);
    }
    // vat_remittances: tracks VAT payments made to the tax authority
    // VAT Payable = cumulative output VAT collected − SUM(amount_remitted)
    await client.query(`
      CREATE TABLE IF NOT EXISTS vat_remittances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "branchId" UUID NOT NULL,
        "periodFrom" DATE NOT NULL,
        "periodTo" DATE NOT NULL,
        "amountRemitted" DECIMAL(14,2) NOT NULL,
        "remittedDate" DATE NOT NULL,
        "referenceNo" VARCHAR(100),
        notes TEXT,
        "createdBy" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // chart_of_accounts: real, structured account registry. The ~42 system accounts
    // (1001-5015) are seeded below and drive Balance Sheet / P&L exactly as before —
    // custom accounts (added by ADMIN/FINANCE via the UI) extend the same structure.
    await client.query(`
      CREATE TABLE IF NOT EXISTS chart_of_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "accountNumber" VARCHAR UNIQUE NOT NULL,
        "accountName" VARCHAR NOT NULL,
        category VARCHAR NOT NULL,
        "accountGroup" VARCHAR NOT NULL,
        "parentAccountId" UUID REFERENCES chart_of_accounts(id),
        "sourceType" VARCHAR NOT NULL,
        "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
        "linkedCashBankAccountId" UUID REFERENCES cash_bank_accounts(id),
        "categoryKey" VARCHAR,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdBy" UUID,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS income_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "incomeNo" VARCHAR UNIQUE NOT NULL,
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
        "receivedTo" UUID REFERENCES cash_bank_accounts(id),
        "receivedDate" DATE,
        "receivedMode" VARCHAR,
        "referenceNo" VARCHAR,
        "approvedBy" UUID,
        "receiptUrl" VARCHAR,
        notes TEXT,
        "createdBy" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS manual_journal_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "entryNo" VARCHAR UNIQUE NOT NULL,
        date DATE NOT NULL,
        "chartOfAccountId" UUID NOT NULL REFERENCES chart_of_accounts(id),
        amount DECIMAL(14,2) NOT NULL,
        description TEXT NOT NULL,
        "branchId" UUID NOT NULL,
        "referenceNo" VARCHAR,
        notes TEXT,
        "createdBy" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );

      INSERT INTO chart_of_accounts
        ("accountNumber", "accountName", category, "accountGroup", "sourceType", "isSystemDefault", "isActive")
      VALUES
        ('1001', 'Cash in Hand', 'ASSET', 'CURRENT_ASSET', 'SYSTEM', true, true),
        ('1002', 'Cash at Bank', 'ASSET', 'CURRENT_ASSET', 'SYSTEM', true, true),
        ('1003', 'Accounts Receivable', 'ASSET', 'CURRENT_ASSET', 'SYSTEM', true, true),
        ('1004', 'Security Deposits Receivable', 'ASSET', 'CURRENT_ASSET', 'SYSTEM', true, true),
        ('1005', 'Prepaid Expenses', 'ASSET', 'CURRENT_ASSET', 'SYSTEM', true, true),
        ('1006', 'Spare Parts Inventory', 'ASSET', 'CURRENT_ASSET', 'SYSTEM', true, true),
        ('1007', 'Equipment Gross Cost', 'ASSET', 'NON_CURRENT_ASSET', 'SYSTEM', true, true),
        ('1008', 'Accumulated Depreciation', 'ASSET', 'NON_CURRENT_ASSET', 'SYSTEM', true, true),
        ('1009', 'Product Inventory', 'ASSET', 'CURRENT_ASSET', 'SYSTEM', true, true),
        ('2001', 'Accounts Payable', 'LIABILITY', 'CURRENT_LIABILITY', 'SYSTEM', true, true),
        ('2002', 'Accrued Expenses', 'LIABILITY', 'CURRENT_LIABILITY', 'SYSTEM', true, true),
        ('2003', 'VAT Payable', 'LIABILITY', 'CURRENT_LIABILITY', 'SYSTEM', true, true),
        ('2004', 'Security Deposits Received', 'LIABILITY', 'CURRENT_LIABILITY', 'SYSTEM', true, true),
        ('2005', 'Deferred Revenue', 'LIABILITY', 'CURRENT_LIABILITY', 'SYSTEM', true, true),
        ('2006', 'Salary Payable', 'LIABILITY', 'CURRENT_LIABILITY', 'SYSTEM', true, true),
        ('3001', 'Owner''s Capital', 'EQUITY', 'EQUITY', 'SYSTEM', true, true),
        ('3002', 'Retained Earnings', 'EQUITY', 'EQUITY', 'SYSTEM', true, true),
        ('3003', 'Reserves', 'EQUITY', 'EQUITY', 'SYSTEM', true, true),
        ('3004', 'Less: Withdrawals', 'EQUITY', 'EQUITY', 'SYSTEM', true, true),
        ('3005', 'Less: Dividends', 'EQUITY', 'EQUITY', 'SYSTEM', true, true),
        ('4001', 'Rental Revenue', 'INCOME', 'INCOME', 'SYSTEM', true, true),
        ('4002', 'Lease Revenue', 'INCOME', 'INCOME', 'SYSTEM', true, true),
        ('4003', 'Sales Revenue', 'INCOME', 'INCOME', 'SYSTEM', true, true),
        ('4004', 'Service Revenue', 'INCOME', 'INCOME', 'SYSTEM', true, true),
        ('4005', 'Usage / Copy Revenue', 'INCOME', 'INCOME', 'SYSTEM', true, true),
        ('4006', 'AMC / SMA Revenue', 'INCOME', 'INCOME', 'SYSTEM', true, true),
        ('4007', 'Spare Part Sales', 'INCOME', 'INCOME', 'SYSTEM', true, true),
        ('4008', 'Other Income', 'INCOME', 'INCOME', 'SYSTEM', true, true),
        ('4009', 'Accessories Sales Revenue', 'INCOME', 'INCOME', 'SYSTEM', true, true),
        ('5001', 'Cost of Parts', 'EXPENSE', 'EXPENSE', 'SYSTEM', true, true),
        ('5002', 'Labour Cost', 'EXPENSE', 'EXPENSE', 'SYSTEM', true, true),
        ('5003', 'Depreciation Expense', 'EXPENSE', 'EXPENSE', 'SYSTEM', true, true),
        ('5004', 'Vendor Purchases', 'EXPENSE', 'EXPENSE', 'SYSTEM', true, true),
        ('5005', 'Shipping & Handling', 'EXPENSE', 'EXPENSE', 'SYSTEM', true, true),
        ('5006', 'Salary Expense', 'EXPENSE', 'EXPENSE', 'SYSTEM', true, true),
        ('5007', 'Travel Expense', 'EXPENSE', 'EXPENSE', 'SYSTEM', true, true),
        ('5008', 'Rent Expense', 'EXPENSE', 'EXPENSE', 'SYSTEM', true, true),
        ('5009', 'Utilities Expense', 'EXPENSE', 'EXPENSE', 'SYSTEM', true, true),
        ('5010', 'Marketing Expense', 'EXPENSE', 'EXPENSE', 'SYSTEM', true, true),
        ('5011', 'Maintenance Expense', 'EXPENSE', 'EXPENSE', 'SYSTEM', true, true),
        ('5012', 'Insurance Expense', 'EXPENSE', 'EXPENSE', 'SYSTEM', true, true),
        ('5013', 'Other Expenses', 'EXPENSE', 'EXPENSE', 'SYSTEM', true, true),
        ('5014', 'Import / Purchase Labour Cost', 'EXPENSE', 'EXPENSE', 'SYSTEM', true, true),
        ('5015', 'Customs Duty', 'EXPENSE', 'EXPENSE', 'SYSTEM', true, true)
      ON CONFLICT ("accountNumber") DO NOTHING;
    `);
    logger.info('Chart of accounts module tables created/verified.');
    logger.info('Finance accounts module tables created/verified.');

    // ─── Employee Expense Requests ─────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_expense_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "requestNo" VARCHAR UNIQUE NOT NULL,
        "employeeId" UUID NOT NULL,
        "employeeName" VARCHAR NOT NULL,
        "employeeRole" VARCHAR NOT NULL,
        "branchId" UUID NOT NULL,
        "branchName" VARCHAR NOT NULL,
        date DATE NOT NULL,
        category VARCHAR NOT NULL,
        "subCategory" VARCHAR,
        description TEXT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'AED',
        "receiptUrl" VARCHAR,
        status VARCHAR NOT NULL DEFAULT 'PENDING',
        "submittedAt" TIMESTAMP,
        "reviewedBy" UUID,
        "reviewedByName" VARCHAR,
        "reviewedAt" TIMESTAMP,
        "rejectionReason" TEXT,
        "paidAt" TIMESTAMP,
        "paidFromAccount" UUID,
        "paymentReference" VARCHAR,
        "expenseEntryId" UUID,
        notes TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_expense_req_employee ON employee_expense_requests("employeeId");
      CREATE INDEX IF NOT EXISTS idx_expense_req_branch ON employee_expense_requests("branchId");
      CREATE INDEX IF NOT EXISTS idx_expense_req_status ON employee_expense_requests(status);
      CREATE INDEX IF NOT EXISTS idx_expense_req_date ON employee_expense_requests(date);
    `);
    logger.info('Employee expense requests table created/verified.');

    // ─── Manager Purchase Payment Request columns on employee_expense_requests ──
    await client.query(`
      ALTER TABLE employee_expense_requests
        ADD COLUMN IF NOT EXISTS "requestSource" VARCHAR NOT NULL DEFAULT 'EMPLOYEE_EXPENSE',
        ADD COLUMN IF NOT EXISTS "purchaseId" VARCHAR NULL,
        ADD COLUMN IF NOT EXISTS "purchaseRef" VARCHAR NULL,
        ADD COLUMN IF NOT EXISTS "vendorName" VARCHAR NULL,
        ADD COLUMN IF NOT EXISTS "paymentMode" VARCHAR NULL,
        ADD COLUMN IF NOT EXISTS "paidFromAccountId" UUID NULL,
        ADD COLUMN IF NOT EXISTS "purchasePaymentId" UUID NULL,
        ADD COLUMN IF NOT EXISTS "chequeNumber" VARCHAR NULL,
        ADD COLUMN IF NOT EXISTS "chequeBankName" VARCHAR NULL,
        ADD COLUMN IF NOT EXISTS "chequeDueDate" DATE NULL,
        ADD COLUMN IF NOT EXISTS "purchaseOrigin" VARCHAR NULL;
    `);
    logger.info('Manager purchase payment request columns on expense_requests ensured.');
    // ─── Cash & Bank extended columns + reconciliation table ─────────────────
    await client.query(`
      ALTER TABLE cash_bank_accounts
        ADD COLUMN IF NOT EXISTS iban VARCHAR,
        ADD COLUMN IF NOT EXISTS "accountType" VARCHAR DEFAULT 'CURRENT',
        ADD COLUMN IF NOT EXISTS "openingDate" DATE,
        ADD COLUMN IF NOT EXISTS "responsiblePersonId" UUID,
        ADD COLUMN IF NOT EXISTS "contactPerson" VARCHAR,
        ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN DEFAULT false;

      -- Cashbook auto-posting source tracking (idempotency for receipts/expense payments)
      ALTER TABLE cashbook_entries
        ADD COLUMN IF NOT EXISTS "sourceType" VARCHAR,
        ADD COLUMN IF NOT EXISTS "sourceId" UUID;

      CREATE UNIQUE INDEX IF NOT EXISTS "uniq_cashbook_source"
        ON cashbook_entries ("sourceType", "sourceId")
        WHERE "sourceType" IS NOT NULL;

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

    // ─── Asset Depreciation Register — extended columns ───────────────────────
    await client.query(`
      ALTER TABLE asset_depreciation_register
        ALTER COLUMN "productId" DROP NOT NULL,
        ADD COLUMN IF NOT EXISTS "assetType" VARCHAR DEFAULT 'PRINTER_PRODUCT',
        ADD COLUMN IF NOT EXISTS "assetCategory" VARCHAR DEFAULT 'PRINTER_EQUIPMENT',
        ADD COLUMN IF NOT EXISTS "assetName" VARCHAR NULL;
    `);
    logger.info('Asset depreciation register extended columns applied.');

    // ─── Cheque Management Tables ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS cheques (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cheque_no VARCHAR NOT NULL,
        bank_name VARCHAR,
        party_name VARCHAR NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        due_date DATE NOT NULL,
        cheque_date DATE,
        issue_date DATE,
        deposit_date DATE,
        cleared_date DATE,
        type VARCHAR NOT NULL DEFAULT 'RECEIVED',
        status VARCHAR NOT NULL DEFAULT 'PENDING',
        description TEXT,
        branch_id UUID NOT NULL,
        account_id UUID REFERENCES cash_bank_accounts(id),
        cashbook_entry_id UUID REFERENCES cashbook_entries(id),
        created_by VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS cheque_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cheque_id UUID NOT NULL REFERENCES cheques(id) ON DELETE CASCADE,
        from_status VARCHAR,
        to_status VARCHAR NOT NULL,
        notes TEXT,
        changed_by VARCHAR NOT NULL,
        changed_at TIMESTAMP DEFAULT NOW()
      );
    `);
    logger.info('Cheque management tables created.');

    // ─── Cheques: source tracing columns ──────────────────────────────────────
    await client.query(`
      ALTER TABLE cheques
        ADD COLUMN IF NOT EXISTS source_type VARCHAR NULL,
        ADD COLUMN IF NOT EXISTS source_reference_id UUID NULL,
        ADD COLUMN IF NOT EXISTS source_label VARCHAR(500) NULL,
        ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(100) NULL;
    `);
    logger.info('Cheque source tracing columns applied.');

    // ─── Cheques: cheque_date / deposit_date / cleared_date ────────────────────
    // issue_date used to be silently reused for THREE different meanings depending
    // on lifecycle stage (cheque date at creation, deposit date at Deposit, issue-to-
    // vendor date at Issue) — losing the original cheque date the moment a RECEIVED
    // cheque was deposited. These are now distinct columns; the routes below stop
    // overwriting issue_date at Deposit.
    await client.query(`
      ALTER TABLE cheques
        ADD COLUMN IF NOT EXISTS cheque_date DATE NULL,
        ADD COLUMN IF NOT EXISTS deposit_date DATE NULL,
        ADD COLUMN IF NOT EXISTS cleared_date DATE NULL;
    `);
    // Best-effort backfill for pre-existing rows:
    //  - PENDING cheques never had issue_date overwritten yet, so it still holds
    //    whatever was captured at creation — safe to treat as cheque_date.
    //  - RECEIVED cheques already DEPOSITED/CLEARED/BOUNCED had issue_date
    //    overwritten with the deposit date by the old /deposit handler — recover
    //    that into deposit_date. Their true original cheque_date is unrecoverable
    //    and is left NULL (frontend shows "—").
    await client.query(`
      UPDATE cheques SET cheque_date = issue_date
      WHERE cheque_date IS NULL AND issue_date IS NOT NULL AND status = 'PENDING';
    `);
    await client.query(`
      UPDATE cheques SET deposit_date = issue_date
      WHERE deposit_date IS NULL AND issue_date IS NOT NULL
        AND type = 'RECEIVED' AND status IN ('DEPOSITED', 'CLEARED', 'BOUNCED');
    `);
    logger.info('Cheque cheque_date/deposit_date/cleared_date columns applied.');

    // ─── Cheques: 2-date model — collected_date, cheque_date becomes the sole
    // deposit/presentment-eligibility date, due_date deprecated ─────────────────
    // "Cheque Date" was redefined to mean exactly what cheque_date already tracked
    // (the earliest legally-presentable date) — due_date, the older, more general
    // "expected settlement" field, is retired from active use. The column itself is
    // kept (not dropped) purely to avoid a destructive migration / preserve any
    // historical audit trail; every write path now sets it equal to cheque_date.
    await client.query(`
      ALTER TABLE cheques
        ADD COLUMN IF NOT EXISTS collected_date DATE NULL;
    `);
    // Backfill: any pre-existing row where cheque_date is still null (predates that
    // column, or was created before this field became mandatory) — due_date was the
    // only date collected at the time, so it's the correct value to carry forward.
    // collected_date has no reliable historical source and is deliberately left NULL,
    // same as the cheque_date backfill above leaves gaps rather than inventing data.
    await client.query(`
      UPDATE cheques SET cheque_date = due_date WHERE cheque_date IS NULL;
    `);
    logger.info('Cheque collected_date column applied; cheque_date backfilled from due_date.');

    // ─── Tax Report: customer snapshot columns on invoices ─────────────────────
    await client.query(`
      ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS customer_vat_number VARCHAR(50) NULL,
        ADD COLUMN IF NOT EXISTS customer_country VARCHAR(2) NULL;
    `);

    // ─── Country Tax Rules table ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS country_tax_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        country VARCHAR(2) NOT NULL UNIQUE,
        tax_name VARCHAR(50) NOT NULL,
        default_tax_percent DECIMAL(5,2) NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    logger.info('Country tax rules table and invoice customer snapshot columns applied.');

    // ─── customer_state_province and customer_city columns on invoices ──────────
    await client.query(`
      ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS customer_state_province VARCHAR(100) NULL,
        ADD COLUMN IF NOT EXISTS customer_city VARCHAR(100) NULL;
    `);

    // ─── Guarantee Cheques table ───────────────────────────────────────────────
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guarantee_cheques_status_enum') THEN
          CREATE TYPE guarantee_cheques_status_enum AS ENUM ('RECEIVED', 'RETURNED', 'DEPOSITED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guarantee_cheques_purpose_enum') THEN
          CREATE TYPE guarantee_cheques_purpose_enum AS ENUM ('PERFORMANCE_SECURITY', 'OTHER');
        END IF;
      END $$;
    `);
    try {
      await client.query(
        `ALTER TYPE guarantee_cheques_status_enum ADD VALUE IF NOT EXISTS 'DEPOSITED';`,
      );
    } catch (err) {
      logger.debug(
        `Skipped adding DEPOSITED to guarantee_cheques_status_enum: ${(err as Error).message}`,
      );
    }
    await client.query(`
      CREATE TABLE IF NOT EXISTS guarantee_cheques (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        contract_invoice_id UUID NULL,
        contract_reference VARCHAR(255) NULL,
        cheque_number VARCHAR(100) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        currency_code VARCHAR(3) NOT NULL DEFAULT 'AED',
        bank_name VARCHAR(150) NOT NULL,
        received_date DATE NOT NULL,
        purpose guarantee_cheques_purpose_enum NOT NULL DEFAULT 'PERFORMANCE_SECURITY',
        status guarantee_cheques_status_enum NOT NULL DEFAULT 'RECEIVED',
        returned_date DATE NULL,
        deposited_date DATE NULL,
        deposited_to_account_id UUID NULL,
        branch_id UUID NOT NULL,
        created_by UUID NOT NULL,
        notes TEXT NULL,
        deleted_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      ALTER TABLE guarantee_cheques
        ADD COLUMN IF NOT EXISTS deposited_date DATE NULL,
        ADD COLUMN IF NOT EXISTS deposited_to_account_id UUID NULL;
    `);
    logger.info('Guarantee cheques table ensured.');

    // ─── credit_notes: spare-part support + tax snapshot + payment mode columns ─
    await client.query(`
      ALTER TABLE credit_notes
        ADD COLUMN IF NOT EXISTS item_category VARCHAR(20) NOT NULL DEFAULT 'PRODUCT',
        ADD COLUMN IF NOT EXISTS "sparePartId" UUID NULL,
        ADD COLUMN IF NOT EXISTS "sku" VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS "quantity" INTEGER NULL,
        ADD COLUMN IF NOT EXISTS tax_name VARCHAR(50) NULL,
        ADD COLUMN IF NOT EXISTS tax_percent DECIMAL(5,2) NULL,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) NULL,
        ADD COLUMN IF NOT EXISTS "paymentMode" VARCHAR(100) NULL,
        ADD COLUMN IF NOT EXISTS "replacementSparePartId" UUID NULL,
        ADD COLUMN IF NOT EXISTS "replacementSparePartName" VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS "replacementSparePartSku" VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS "replacementQuantity" INTEGER NULL;
    `);
    logger.info('credit_notes spare-part and tax columns ensured.');

    // ─── credit_notes: relax PRODUCT-only NOT NULL constraints ──────────────────
    // The original CREATE TABLE marked productId/productName/modelName/brand NOT
    // NULL, but the entity and controller have always treated them as optional
    // (PRODUCT-only) columns — creditNoteController.create() explicitly leaves
    // them unset for itemCategory='SPARE_PART'. On any table created before this
    // fix, that meant every SPARE_PART credit note insert failed outright with a
    // not-null violation — spare-part returns/refunds were completely unusable.
    await client.query(`
      ALTER TABLE credit_notes
        ALTER COLUMN "productId" DROP NOT NULL,
        ALTER COLUMN "productName" DROP NOT NULL,
        ALTER COLUMN "modelName" DROP NOT NULL,
        ALTER COLUMN "brand" DROP NOT NULL;
    `);
    logger.info('credit_notes PRODUCT-only columns relaxed to nullable for SPARE_PART support.');

    // ─── Cashbook: reversal tracking + PO orphan flag ─────────────────────────
    await client.query(`
      ALTER TABLE cashbook_entries
        ADD COLUMN IF NOT EXISTS "isReversed" BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "reversedById" UUID DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "isPoOrphaned" BOOLEAN DEFAULT NULL;
    `);
    logger.info('Cashbook reversal + PO-orphan columns ensured.');

    // ─── Employee Targets & Target Achievements tables ──────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_targets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "employeeId" VARCHAR NOT NULL,
        "branchId" VARCHAR NOT NULL,
        "assignedBy" VARCHAR NOT NULL,
        "targetMonth" VARCHAR(7) NOT NULL,
        "targetAmount" DECIMAL(12, 2) NOT NULL,
        "targetType" VARCHAR(255) NOT NULL,
        "currencyCode" VARCHAR(3) NOT NULL,
        "tiers" JSONB NOT NULL DEFAULT '[]',
        "status" VARCHAR(255) NOT NULL DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uniq_employee_month UNIQUE ("employeeId", "targetMonth")
      );

      CREATE TABLE IF NOT EXISTS employee_target_achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "targetId" VARCHAR UNIQUE NOT NULL,
        "employeeId" VARCHAR NOT NULL,
        "branchId" VARCHAR NOT NULL,
        "targetMonth" VARCHAR(7) NOT NULL,
        "targetAmount" DECIMAL(12, 2) NOT NULL,
        "achievedAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
        "achievementPercent" DECIMAL(6, 2) NOT NULL DEFAULT 0,
        "appliedTierPercent" DECIMAL(6, 2) NOT NULL DEFAULT 0,
        "incentiveAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
        "dealCount" INTEGER NOT NULL DEFAULT 0,
        "calculatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "isFinalized" BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);
    logger.info('Employee targets and achievements tables ensured.');

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

    // Receipt attachments now live on payment_transactions (unified payment path).
    await client.query(
      `ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS receipt_url VARCHAR;`,
    );

    // Lets a bounced/cancelled cheque's reversal correction be recorded as its own
    // offsetting transaction (mirrors cashbook_entries.is_reversed/reversed_by_id)
    // instead of mutating or deleting the original approval record.
    await client.query(`
      ALTER TABLE payment_transactions
        ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS reversed_by_id UUID NULL;
    `);

    // payment_ledgers predates the receiptUrl column in its CREATE TABLE DDL —
    // CREATE TABLE IF NOT EXISTS never adds columns to an existing table, so the
    // entity/table mismatch made every SELECT on PaymentLedger fail with 500.
    await client.query(
      `ALTER TABLE payment_ledgers ADD COLUMN IF NOT EXISTS "receiptUrl" VARCHAR(255);`,
    );

    // Reconcile invoice_ledger with the union of both historical payment tables.
    // Payments recorded through the legacy /payments/record path only wrote
    // payment_ledgers rows and never updated the ledger, so paid/balance amounts
    // under-reported. Recomputing from source tables is idempotent.
    // Security deposits are refundable caution money held outside the invoice total, so
    // they are excluded from all settlement sums. payment_transactions states this on the
    // row (is_security_deposit); the remarks test beside it is the legacy signal, kept for
    // payment_ledgers, which has no such column. Matching ONLY on remarks was the actual
    // cause of a recurring drift: deposits approved through the sale-payment workflow are
    // remarked "Security Deposit collected — Invoice <no>", never the bare string, so this
    // reconciliation folded them straight back into paid_amount on every single restart —
    // re-breaking the ledger (and with it the overpayment guard, which then rejected the
    // next legitimate collection) however many times it was corrected by hand.
    logger.info('Reconciling invoice_ledger from payment_transactions + payment_ledgers...');
    try {
      await client.query(`
        WITH paid AS (
          SELECT i.id AS invoice_id,
            COALESCE((SELECT SUM(pt.amount) FROM payment_transactions pt
              WHERE pt.invoice_id = i.id
                AND pt.is_security_deposit = FALSE
                AND (pt.remarks IS NULL OR LOWER(TRIM(pt.remarks)) != 'security deposit')), 0)
            + COALESCE((SELECT SUM(pl."amountPaid") FROM payment_ledgers pl
              WHERE pl."invoiceId" = i.id
                AND (pl.remarks IS NULL OR LOWER(TRIM(pl.remarks)) != 'security deposit')), 0) AS total_paid
          FROM invoices i
        )
        UPDATE invoice_ledger il
        SET paid_amount = paid.total_paid,
            balance_amount = GREATEST(0, il.total_amount - paid.total_paid),
            updated_at = NOW()
        FROM paid
        WHERE il.invoice_id = paid.invoice_id
          AND il.deleted_at IS NULL
          AND il.paid_amount IS DISTINCT FROM paid.total_paid;
      `);
      await client.query(`
        INSERT INTO invoice_ledger (id, invoice_id, total_amount, paid_amount, balance_amount, created_at, updated_at)
        SELECT gen_random_uuid(), i.id, COALESCE(i."totalAmount", 0), p.total_paid,
               GREATEST(0, COALESCE(i."totalAmount", 0) - p.total_paid), NOW(), NOW()
        FROM invoices i
        JOIN (
          SELECT invoice_id, SUM(total_paid) AS total_paid FROM (
            SELECT invoice_id, SUM(amount) AS total_paid FROM payment_transactions
              WHERE is_security_deposit = FALSE
                AND (remarks IS NULL OR LOWER(TRIM(remarks)) != 'security deposit')
              GROUP BY invoice_id
            UNION ALL
            SELECT "invoiceId" AS invoice_id, SUM("amountPaid") AS total_paid FROM payment_ledgers
              WHERE (remarks IS NULL OR LOWER(TRIM(remarks)) != 'security deposit')
              GROUP BY "invoiceId"
          ) u GROUP BY invoice_id
        ) p ON p.invoice_id = i.id
        WHERE NOT EXISTS (SELECT 1 FROM invoice_ledger il WHERE il.invoice_id = i.id);
      `);
      logger.info('invoice_ledger reconciliation completed.');
    } catch (err) {
      logger.warn('invoice_ledger reconciliation failed (non-fatal):', err);
    }

    // Direct sales used to be force-marked PAID at activation regardless of money
    // received. Demote any such invoice whose recorded payments (excluding security
    // deposits) do not cover the total back to INVOICED. recordPayment() flips them
    // to PAID again once fully settled. Idempotent — safe to run on every boot.
    try {
      const demoted = await client.query(`
        UPDATE invoices i
        SET status = 'INVOICED'
        WHERE i.status = 'PAID'
          AND i."saleType" IN ('SALE', 'PRODUCT_SALE', 'SPAREPART_SALE')
          AND COALESCE(i."totalAmount", 0) > 0.01
          AND (
            COALESCE((SELECT SUM(pt.amount) FROM payment_transactions pt
              WHERE pt.invoice_id = i.id
                AND pt.is_security_deposit = FALSE
                AND (pt.remarks IS NULL OR LOWER(TRIM(pt.remarks)) != 'security deposit')), 0)
            + COALESCE((SELECT SUM(pl."amountPaid") FROM payment_ledgers pl
              WHERE pl."invoiceId" = i.id
                AND (pl.remarks IS NULL OR LOWER(TRIM(pl.remarks)) != 'security deposit')), 0)
          ) < COALESCE(i."totalAmount", 0) - 0.01;
      `);
      if (demoted.rowCount && demoted.rowCount > 0) {
        logger.info(
          `Demoted ${demoted.rowCount} not-fully-paid direct sale(s) from PAID to INVOICED.`,
        );
      }
    } catch (err) {
      logger.warn('PAID→INVOICED direct-sale correction failed (non-fatal):', err);
    }

    // ─── Contract's stable default payment mode (Rent/Lease Finance pre-fill) ───
    // Set once from the first payment ever recorded against a contract (the advance,
    // typically) and never overwritten afterward — Finance overriding a later period's
    // mode must not change what subsequent periods default back to.
    await client.query(`
      ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS "preferredPaymentMode" VARCHAR(20) NULL,
        ADD COLUMN IF NOT EXISTS "preferredChequeBankName" VARCHAR(150) NULL;
    `);

    // ─── Manual payable → Purchase Order linkage (mirrors manual_receivables'
    // "linkedInvoiceId") — lets the Payable page/CoA aggregates exclude a manual
    // payable that duplicates a PO's own tracked outstanding balance.
    await client.query(`
      ALTER TABLE manual_payables
        ADD COLUMN IF NOT EXISTS "linkedPurchaseId" UUID NULL;
    `);

    // ─── Customer VAT exemption: snapshot of the customer's VAT status at
    // invoice-creation/assignment time, permanent regardless of later customer
    // edits — see invoiceEntity.ts's customerVatStatus doc comment.
    await client.query(`
      ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS customer_vat_status VARCHAR(30) NULL;
    `);
    logger.info('Invoice customer_vat_status column applied.');

    // ─── Sale Workflow: Contract Agreements ───────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS contract_agreements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "agreementNumber" VARCHAR UNIQUE NOT NULL,
        "invoiceId" UUID NOT NULL,
        "branchId" UUID NOT NULL,
        "contractDate" DATE NOT NULL,
        "customerName" VARCHAR NOT NULL,
        "customerAddress" VARCHAR,
        "customerPhone" VARCHAR,
        "customerEmail" VARCHAR,
        "customerVatNumber" VARCHAR,
        "createdByEmployeeId" UUID NOT NULL,
        "createdByEmployeeName" VARCHAR NOT NULL,
        "dealerName" VARCHAR NOT NULL,
        "dealerAddress" VARCHAR,
        "dealerPhone" VARCHAR,
        "employeeSignatureData" TEXT,
        "employeeSignedById" UUID,
        "employeeSignedByName" VARCHAR,
        "employeeSignedAt" TIMESTAMP,
        "customerSignatureData" TEXT,
        "customerSignedMethod" VARCHAR DEFAULT 'IN_PERSON',
        "customerSignedByName" VARCHAR,
        "customerSignedAt" TIMESTAMP,
        "signingToken" VARCHAR UNIQUE,
        "signingTokenExpiresAt" TIMESTAMP,
        "signingTokenUsed" BOOLEAN NOT NULL DEFAULT false,
        "signatureStatus" VARCHAR NOT NULL DEFAULT 'PENDING_SIGNATURES',
        "termsAndConditions" TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS "IDX_contract_agreements_invoiceId" ON contract_agreements ("invoiceId");
      CREATE INDEX IF NOT EXISTS "IDX_contract_agreements_branchId" ON contract_agreements ("branchId");
    `);
    await client.query(`
      ALTER TABLE contract_agreements ADD COLUMN IF NOT EXISTS "customerSignedDocumentUrl" VARCHAR;
      ALTER TABLE contract_agreements ADD COLUMN IF NOT EXISTS "customerSignedDocumentNote" TEXT;
    `);
    logger.info('Contract agreements table ensured.');

    // ─── Sale Workflow: Installation Requests ─────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS installation_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "invoiceId" UUID NOT NULL,
        "branchId" UUID NOT NULL,
        "assignedByEmployeeId" UUID NOT NULL,
        "assignedByEmployeeName" VARCHAR NOT NULL,
        "technicianId" UUID,
        "technicianName" VARCHAR,
        "customerName" VARCHAR NOT NULL,
        "customerAddress" VARCHAR,
        "invoiceNumber" VARCHAR NOT NULL,
        notes TEXT,
        "startTime" TIMESTAMP,
        "endTime" TIMESTAMP,
        "durationSeconds" INTEGER,
        status VARCHAR NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS "IDX_installation_requests_invoiceId" ON installation_requests ("invoiceId");
      CREATE INDEX IF NOT EXISTS "IDX_installation_requests_branchId" ON installation_requests ("branchId");
    `);
    logger.info('Installation requests table ensured.');

    // installation_requests: columns added after initial table creation
    await client.query(`
      ALTER TABLE installation_requests
        ADD COLUMN IF NOT EXISTS "saleType" VARCHAR NULL,
        ADD COLUMN IF NOT EXISTS "initialReadingEnteredAt" TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS "initialReadingEnteredByName" VARCHAR NULL,
        ADD COLUMN IF NOT EXISTS "initialReadingPhotoUrl" VARCHAR NULL,
        ADD COLUMN IF NOT EXISTS "initialReadingTakenDate" DATE NULL;
    `);
    logger.info('Installation requests extended columns (saleType, initialReadings) ensured.');

    // ─── Sale Workflow: Sale Payment Requests (Finance approval gate) ──────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sale_payment_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "requestNo" VARCHAR UNIQUE NOT NULL,
        "invoiceId" UUID NOT NULL,
        "invoiceNumber" VARCHAR NOT NULL,
        "branchId" UUID NOT NULL,
        "recordedByEmployeeId" UUID NOT NULL,
        "recordedByEmployeeName" VARCHAR NOT NULL,
        "customerName" VARCHAR NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'AED',
        "paymentMode" VARCHAR NOT NULL,
        "paymentDate" DATE NOT NULL,
        "referenceNumber" VARCHAR,
        remarks TEXT,
        "cashAccountId" UUID,
        "chequeNumber" VARCHAR,
        "chequeBankName" VARCHAR,
        "chequeDueDate" DATE,
        "chequeDate" DATE,
        "receiptUrl" VARCHAR,
        status VARCHAR NOT NULL DEFAULT 'PENDING',
        "reviewedById" UUID,
        "reviewedByName" VARCHAR,
        "reviewedAt" TIMESTAMP,
        "rejectionReason" TEXT,
        "paymentTransactionId" UUID,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS "IDX_sale_payment_requests_invoiceId" ON sale_payment_requests ("invoiceId");
      CREATE INDEX IF NOT EXISTS "IDX_sale_payment_requests_branchId" ON sale_payment_requests ("branchId");
      CREATE INDEX IF NOT EXISTS "IDX_sale_payment_requests_status" ON sale_payment_requests (status);
    `);
    logger.info('Sale payment requests table ensured.');

    // sale_payment_requests: columns added after initial table creation
    await client.query(`
      ALTER TABLE sale_payment_requests
        ADD COLUMN IF NOT EXISTS "collectLater" BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "paymentContext" VARCHAR NULL;
    `);
    logger.info('Sale payment requests extended columns (collectLater, paymentContext) ensured.');

    // machine_swap_requests: serial number swap requests raised by technicians
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'swap_request_status_enum') THEN
          CREATE TYPE swap_request_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
        END IF;
      END $$;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS machine_swap_requests (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id             UUID NOT NULL,
        contract_id           UUID NOT NULL,
        invoice_number        VARCHAR(100) NOT NULL,
        contract_type         VARCHAR(50) NOT NULL,
        customer_name         VARCHAR(255),
        model_id              UUID,
        model_name            VARCHAR(255),
        current_product_id    UUID,
        current_serial_number VARCHAR(255) NOT NULL,
        requested_product_id  UUID NOT NULL,
        requested_serial_number VARCHAR(255) NOT NULL,
        reason                TEXT,
        requested_by_id       UUID NOT NULL,
        requested_by_name     VARCHAR(255) NOT NULL,
        status                swap_request_status_enum NOT NULL DEFAULT 'PENDING',
        reviewed_by_id        UUID,
        reviewed_by_name      VARCHAR(255),
        reviewed_at           TIMESTAMPTZ,
        rejection_reason      TEXT,
        swap_executed_at      TIMESTAMPTZ,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS "IDX_machine_swap_requests_branchId"   ON machine_swap_requests (branch_id);
      CREATE INDEX IF NOT EXISTS "IDX_machine_swap_requests_contractId" ON machine_swap_requests (contract_id);
      CREATE INDEX IF NOT EXISTS "IDX_machine_swap_requests_status"     ON machine_swap_requests (status);
    `);
    logger.info('machine_swap_requests table ensured.');

    // Fix: Rent/Lease contracts stuck at FINANCE_APPROVED after activation.
    // activateContract() previously omitted setting status = ACTIVE_CONTRACT for the RENT/LEASE
    // branch, leaving them invisible to the AR query, cron job, and recordPayment() gate.
    await client.query(`
      UPDATE invoices
      SET status = 'ACTIVE_CONTRACT'
      WHERE type = 'PROFORMA'
        AND "contractStatus" = 'ACTIVE'
        AND status = 'FINANCE_APPROVED'
        AND "saleType" IN ('RENT', 'LEASE');
    `);
    logger.info('Backfill: stuck RENT/LEASE contracts set to ACTIVE_CONTRACT.');

    // Delivery status: tracks whether the physical machine has reached the
    // customer's premises. Gates the Assign Technician action — installation
    // makes no sense before the machine is on-site.
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoices_deliverystatus_enum') THEN
          CREATE TYPE invoices_deliverystatus_enum AS ENUM ('NOT_DELIVERED', 'DELIVERED');
        END IF;
      END $$;
    `);
    await client.query(`
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS "deliveryStatus" invoices_deliverystatus_enum NOT NULL DEFAULT 'NOT_DELIVERED';
    `);
    logger.info('Delivery status column ensured on invoices table.');

    // Backfill: a contract that already has an installation request (any
    // status) already had its machine on-site when that request was raised —
    // mark it Delivered so pre-existing rows don't lose the Wrench icon.
    await client.query(`
      UPDATE invoices i
      SET "deliveryStatus" = 'DELIVERED'
      FROM installation_requests ir
      WHERE ir."invoiceId" = i.id
        AND i."deliveryStatus" = 'NOT_DELIVERED';
    `);
    logger.info('Backfill: contracts with an existing installation request marked DELIVERED.');

    // Payment Timing: ADVANCE (default) vs ARREARS billing for Rent/Lease contracts.
    // Existing contracts follow Advance Billing behavior, so they default to ADVANCE.
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoices_paymenttiming_enum') THEN
          CREATE TYPE invoices_paymenttiming_enum AS ENUM ('ADVANCE', 'ARREARS');
        END IF;
      END $$;
    `);
    await client.query(`
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS "paymentTiming" invoices_paymenttiming_enum NOT NULL DEFAULT 'ADVANCE';
    `);
    logger.info('Payment timing column (ADVANCE/ARREARS) ensured on invoices table.');

    // Contract Renewal — Finance's decision (Renewal Approved / Contract Ended) recorded
    // once a Rent/Lease-FSM contract enters its final billing period, plus who/when.
    await client.query(`
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS "renewalDecision" varchar,
      ADD COLUMN IF NOT EXISTS "renewalDecisionBy" varchar,
      ADD COLUMN IF NOT EXISTS "renewalDecisionAt" timestamp;
    `);
    logger.info('Contract renewal decision columns ensured on invoices table.');

    // Links a periodic Rent/Lease sale-payment request back to the specific billing
    // period (usage_records row) it was collected against, so a partial collection's
    // shortfall can be tracked and topped up per-period (Pending Payments tab).
    await client.query(`
      ALTER TABLE sale_payment_requests
      ADD COLUMN IF NOT EXISTS "usageRecordId" UUID NULL;
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sale_payment_requests_usageRecordId"
        ON sale_payment_requests ("usageRecordId");
    `);
    logger.info('usageRecordId column ensured on sale_payment_requests table.');

    // VAT breakdown columns — usage_records (per-period tax layered on top of the
    // existing pricing calculation) and sale_payment_requests (RENT_ADVANCE/
    // LEASE_ADVANCE gross-up breakdown).
    await client.query(`
      ALTER TABLE usage_records
      ADD COLUMN IF NOT EXISTS "taxableAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "taxPercent" DECIMAL(5,2) NULL;
    `);
    await client.query(`
      ALTER TABLE sale_payment_requests
      ADD COLUMN IF NOT EXISTS "taxableAmount" DECIMAL(12,2) NULL,
      ADD COLUMN IF NOT EXISTS "taxAmount" DECIMAL(12,2) NULL,
      ADD COLUMN IF NOT EXISTS "taxPercent" DECIMAL(5,2) NULL;
    `);
    logger.info('VAT breakdown columns ensured on usage_records and sale_payment_requests.');

    // isSecurityDeposit — declared on SalePaymentRequestEntity (and read/written by
    // every RENT/LEASE security-deposit collection path, and by approveSalePayment's
    // GuaranteeCheque-vs-Cheque routing) but the column itself was never migrated onto
    // this table. Every collection attempt was failing at INSERT with a raw
    // "column does not exist" QueryFailedError — the entire security-deposit feature
    // has been dead since it was added, on every branch that ever calls
    // recordSalePayment with isSecurityDeposit: true.
    await client.query(`
      ALTER TABLE sale_payment_requests
      ADD COLUMN IF NOT EXISTS "isSecurityDeposit" BOOLEAN NOT NULL DEFAULT false;
    `);
    logger.info('isSecurityDeposit column ensured on sale_payment_requests table.');

    // Security Deposit refund tracking — Cash/Bank deposits only (see
    // refundSecurityDeposit in saleWorkflowController.ts). A Cheque deposit's refund is
    // the existing GuaranteeCheque RECEIVED→RETURNED transition instead; these columns
    // stay null for that path.
    await client.query(`
      ALTER TABLE sale_payment_requests
      ADD COLUMN IF NOT EXISTS "isRefunded" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS "refundedById" UUID NULL,
      ADD COLUMN IF NOT EXISTS "refundedByName" VARCHAR NULL,
      ADD COLUMN IF NOT EXISTS "refundCashAccountId" UUID NULL;
    `);
    logger.info('Security deposit refund columns ensured on sale_payment_requests table.');

    // Backfill: every existing usage_records row predates VAT layering, so its
    // totalCharge is entirely taxable base with zero tax — mirror that explicitly
    // rather than leaving taxableAmount at the column default of 0 (which would
    // silently misstate the base for any pre-existing period).
    await client.query(`
      UPDATE usage_records
      SET "taxableAmount" = "totalCharge"
      WHERE "taxableAmount" = 0 AND "taxAmount" = 0 AND "totalCharge" > 0;
    `);
    logger.info('Backfill: pre-existing usage_records taxableAmount set to totalCharge.');

    // One contract agreement per invoice. createOrGetContractAgreement's check-then-insert
    // (findOne, then save if absent) let two concurrent requests for the same invoice both
    // pass the check and both insert — the second one previously succeeded silently instead
    // of erroring, leaving two agreement rows for one invoice. Isolated in its own try/catch
    // since it will fail to create if pre-existing prod data already has duplicates — that
    // needs a manual data cleanup, not a boot-time crash.
    try {
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "uniq_contract_agreements_invoiceId"
          ON contract_agreements ("invoiceId");
      `);
    } catch (err) {
      logger.warn(
        `Could not create uniq_contract_agreements_invoiceId index — likely pre-existing ` +
          `duplicate contract_agreements rows for the same invoiceId need manual cleanup first: ${(err as Error).message}`,
      );
    }

    // Bill creation + customer approval (Stage A of the Rent/Lease billing redesign) —
    // a UsageRecord doubles as the period's Bill, so these columns mirror
    // ContractAgreement's signing-token/approval-status shape rather than a new table.
    await client.query(`
      ALTER TABLE usage_records
      ADD COLUMN IF NOT EXISTS "billStatus" VARCHAR NOT NULL DEFAULT 'PENDING_APPROVAL',
      ADD COLUMN IF NOT EXISTS "billCreatedByEmployeeId" UUID NULL,
      ADD COLUMN IF NOT EXISTS "billCreatedByName" VARCHAR NULL,
      ADD COLUMN IF NOT EXISTS "billSentAt" TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS "signingToken" VARCHAR NULL,
      ADD COLUMN IF NOT EXISTS "signingTokenExpiresAt" TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS "signingTokenUsed" BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "customerApprovedByName" VARCHAR NULL,
      ADD COLUMN IF NOT EXISTS "customerApprovedAt" TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS "customerApprovalMethod" VARCHAR NULL,
      ADD COLUMN IF NOT EXISTS "customerApprovalNote" TEXT NULL,
      ADD COLUMN IF NOT EXISTS "customerRejectionReason" TEXT NULL,
      ADD COLUMN IF NOT EXISTS "customerRejectedAt" TIMESTAMP NULL;
    `);
    try {
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "uniq_usage_records_signingToken"
          ON usage_records ("signingToken") WHERE "signingToken" IS NOT NULL;
      `);
    } catch (err) {
      logger.warn(
        `Could not create uniq_usage_records_signingToken index: ${(err as Error).message}`,
      );
    }
    logger.info('Bill approval columns ensured on usage_records.');

    // Backfill: every usage_records row that existed BEFORE this feature shipped went
    // through the old combined usage+collection flow — treat those as already approved
    // so historical periods don't suddenly block collection topping-up
    // (getPendingUsagePayments) behind an approval step that never existed when they
    // were created. This must run exactly once, ever — a time-relative guard (e.g. "older
    // than N minutes") is unsound here: billStatus is a real in-flight business state, and
    // any bill genuinely still awaiting customer approval when the service happens to
    // restart would otherwise get silently marked CUSTOMER_APPROVED with no customer
    // action at all. A one-time marker table is the only correct guard.
    await client.query(`
      CREATE TABLE IF NOT EXISTS migration_markers (key VARCHAR PRIMARY KEY, "ranAt" TIMESTAMP NOT NULL DEFAULT NOW());
    `);
    const backfillMarker = await client.query(
      `SELECT 1 FROM migration_markers WHERE key = 'usage_records_bill_status_backfill';`,
    );
    if (backfillMarker.rows.length === 0) {
      await client.query(`
        UPDATE usage_records
        SET "billStatus" = 'CUSTOMER_APPROVED', "customerApprovalMethod" = 'FINANCE_MANUAL'
        WHERE "billStatus" = 'PENDING_APPROVAL';
      `);
      await client.query(
        `INSERT INTO migration_markers (key) VALUES ('usage_records_bill_status_backfill');`,
      );
      logger.info('Backfill: pre-existing usage_records marked CUSTOMER_APPROVED (one-time).');
    }

    // Advance Bill support — same UsageRecord table, distinguished from a periodic usage
    // Bill by billType. Existing rows default to 'USAGE' (the column default already
    // covers this; no backfill needed).
    await client.query(`
      ALTER TABLE usage_records
      ADD COLUMN IF NOT EXISTS "billType" VARCHAR NOT NULL DEFAULT 'USAGE';
    `);
    logger.info('billType column ensured on usage_records.');

    // Reading Taken Date — the actual date the meter reading was physically taken,
    // distinct from billingPeriodEnd (the period's calendar end date). Backfill existing
    // rows to their billingPeriodEnd so pre-existing bills still show a sensible date
    // instead of blank.
    await client.query(`
      ALTER TABLE usage_records
      ADD COLUMN IF NOT EXISTS "readingTakenDate" DATE;
    `);
    await client.query(`
      UPDATE usage_records SET "readingTakenDate" = "billingPeriodEnd"
      WHERE "readingTakenDate" IS NULL;
    `);
    logger.info('readingTakenDate column ensured (and backfilled) on usage_records.');

    // ProductAllocation.itemType — see the entity's comment on this column for why every
    // consumer of a contract's productAllocations needs it. Defaults (and is backfilled)
    // to 'PRODUCT': every row that existed before accessories could be allocated at all
    // was always a real machine.
    await client.query(`
      ALTER TABLE product_allocations
      ADD COLUMN IF NOT EXISTS "itemType" VARCHAR NOT NULL DEFAULT 'PRODUCT';
    `);
    logger.info('itemType column ensured on product_allocations.');

    // The column above defaults every pre-existing row to PRODUCT, which is wrong for
    // any accessory that was already allocated before this column existed (allocating
    // accessories shipped before the column that tracks which allocations ARE
    // accessories did) — those rows need the correct value pulled from the InvoiceItem
    // they were allocated for. Self-limiting WHERE clause, safe to run on every startup.
    const accessoryBackfill = await client.query(`
      UPDATE product_allocations pa
      SET "itemType" = 'ACCESSORY'
      FROM invoice_items ii
      WHERE ii."productId" = pa."productId"
        AND ii."invoiceId" = pa."contractId"
        AND ii."itemType" = 'ACCESSORY'
        AND pa."itemType" != 'ACCESSORY';
    `);
    logger.info(
      `Backfill: ${accessoryBackfill.rowCount ?? 0} pre-existing accessory allocation(s) corrected from PRODUCT to ACCESSORY.`,
    );
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

        // Fresh database: create the schema from entities, then apply the raw-SQL
        // extras that pre-migrations skipped on the first (fresh) pass.
        const invoicesTable = await Source.query(`SELECT to_regclass('public.invoices') AS tbl;`);
        if (!invoicesTable[0].tbl) {
          logger.info('Fresh database — creating schema from entities via synchronize...');
          await Source.synchronize();
          logger.info('Schema created. Re-running pre-migrations for raw-SQL extras...');
          await runPreMigrations();
        }

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
