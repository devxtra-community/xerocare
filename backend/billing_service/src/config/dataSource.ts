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

    // Ensure status enum exists/has correct values
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoices_status_enum') THEN
          CREATE TYPE invoices_status_enum AS ENUM ('DRAFT', 'SENT', 'PAID', 'CANCELLED');
        END IF;
        
        ALTER TYPE invoices_status_enum ADD VALUE IF NOT EXISTS 'TEMPLATE';
        ALTER TYPE invoices_status_enum ADD VALUE IF NOT EXISTS 'ASSIGNED';
        ALTER TYPE invoices_status_enum ADD VALUE IF NOT EXISTS 'CUSTOMER_ACCEPTED';
        ALTER TYPE invoices_status_enum ADD VALUE IF NOT EXISTS 'CUSTOMER_REJECTED';
        ALTER TYPE invoices_status_enum ADD VALUE IF NOT EXISTS 'EMPLOYEE_APPROVED';
        ALTER TYPE invoices_status_enum ADD VALUE IF NOT EXISTS 'WAITING_FINANCE_APPROVAL';
        ALTER TYPE invoices_status_enum ADD VALUE IF NOT EXISTS 'FINANCE_APPROVED';
        ALTER TYPE invoices_status_enum ADD VALUE IF NOT EXISTS 'FINANCE_REJECTED';
        ALTER TYPE invoices_status_enum ADD VALUE IF NOT EXISTS 'ACTIVE_CONTRACT';
        ALTER TYPE invoices_status_enum ADD VALUE IF NOT EXISTS 'INVOICED';
        ALTER TYPE invoices_status_enum ADD VALUE IF NOT EXISTS 'EXPIRED';
        ALTER TYPE invoices_status_enum ADD VALUE IF NOT EXISTS 'RETAKEN';
        ALTER TYPE invoices_status_enum ADD VALUE IF NOT EXISTS 'SUPERSEDED';
        ALTER TYPE invoices_status_enum ADD VALUE IF NOT EXISTS 'PAID';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Ensure billType enum exists
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoices_billtype_enum') THEN
          CREATE TYPE invoices_billtype_enum AS ENUM ('SERVICE', 'AMC', 'FSMA', 'SMA', 'SALE', 'RENT', 'LEASE');
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

    // Ensure columns exist on invoices table
    try {
      await client.query(`
        ALTER TABLE invoices 
        ADD COLUMN IF NOT EXISTS "billType" invoices_billtype_enum NULL,
        ADD COLUMN IF NOT EXISTS "serviceTicketId" UUID NULL,
        ADD COLUMN IF NOT EXISTS "maxCopyLimit" INTEGER NULL;
      `);
      logger.info(
        'Guaranteed billType, serviceTicketId, and maxCopyLimit columns exist on invoices table.',
      );
    } catch (colErr) {
      logger.warn('Failed to ensure invoices columns (table might not exist yet):', colErr);
    }

    // Ensure credit_notes table and columns exist
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS credit_notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "creditNoteNo" VARCHAR(255) NOT NULL UNIQUE,
          "invoice_id" UUID NOT NULL REFERENCES invoices(id),
          "customerId" UUID NOT NULL,
          "branchId" UUID NOT NULL,
          "productId" UUID NOT NULL,
          "productName" VARCHAR(255) NOT NULL,
          "modelName" VARCHAR(255) NOT NULL,
          "brand" VARCHAR(255) NOT NULL,
          "serialNumber" VARCHAR(255) NULL,
          "productAmount" NUMERIC(12,2) NOT NULL,
          "type" credit_note_type_enum NOT NULL,
          "status" credit_note_status_enum NOT NULL DEFAULT 'DRAFT',
          "sellerEmployeeId" UUID NOT NULL,
          "notes" TEXT NULL,
          "financeNote" TEXT NULL,
          "damageReason" damage_reason_enum NULL,
          "rejectionReason" TEXT NULL,
          "replacementProductId" UUID NULL,
          "replacementSerialNumber" VARCHAR(255) NULL,
          "replacementAmount" NUMERIC(12,2) NULL,
          "replacementDiscount" NUMERIC(12,2) DEFAULT 0,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );

        -- Add missing columns for existing tables
        ALTER TABLE credit_notes 
        ADD COLUMN IF NOT EXISTS "customerName" VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS "invoiceNumber" VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS "replacementDiscount" NUMERIC(12,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "replacementProductName" VARCHAR(255) NULL;

        -- Update them to be NOT NULL if we want, but keeping NULL for legacy data compatibility
        -- or update old records with a placeholder if needed.
      `);
      logger.info('Guaranteed credit_notes table and columns exist.');
    } catch (tableErr) {
      logger.warn('Failed to ensure credit_notes columns:', tableErr);
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
