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

import { logger } from './logger';
import { UsageRecordItem } from '../entities/usageRecordItemEntity';
import { DeviceMeterReading } from '../entities/deviceMeterReadingEntity';
import { AuditLog } from '../entities/auditLogEntity';

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
    PaymentLedger,
    QuotationTemplateAssignment,
    AuditLog,
    InvoiceLedger,
    PaymentTransaction,
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
        ADD COLUMN IF NOT EXISTS estimate_valid_until TIMESTAMP,
        ADD COLUMN IF NOT EXISTS estimate_expired BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS total_discount_amount DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS visit_charge_amount DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS visit_charge_method VARCHAR(30),
        ADD COLUMN IF NOT EXISTS validity_extension_days INT,
        ADD COLUMN IF NOT EXISTS validity_extension_fee DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS validity_extension_fee_added BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS technician_note_to_finance TEXT,
        ADD COLUMN IF NOT EXISTS revision_count INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS validity_days INT DEFAULT 30,
        ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS conversion_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS not_converted_reason TEXT;
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
      logger.info('Guaranteed invoice_ledger and payment_transactions tables exist.');
    } catch (colErr) {
      logger.warn('Failed to ensure invoices or invoice_items columns:', colErr);
    }
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
