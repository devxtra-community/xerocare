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
        ALTER TYPE invoices_status_enum ADD VALUE IF NOT EXISTS 'CANCELLED';
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
