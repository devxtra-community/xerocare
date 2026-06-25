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

import { logger } from './logger';
import { UsageRecordItem } from '../entities/usageRecordItemEntity';
import { DeviceMeterReading } from '../entities/deviceMeterReadingEntity';
import { CreditNote } from '../entities/creditNoteEntity';
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
    CreditNote,
    PaymentLedger,
    QuotationTemplateAssignment,
    AuditLog,
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
        ADD COLUMN IF NOT EXISTS warranty VARCHAR(255) NULL;
      `);
      logger.info(
        'Guaranteed billType, serviceTicketId, and maxCopyLimit columns exist on invoices table, and warranty column exists on invoice_items table.',
      );
    } catch (colErr) {
      logger.warn('Failed to ensure invoices or invoice_items columns:', colErr);
    }
    logger.info('Pre-migration enum values added successfully');

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
