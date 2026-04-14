import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
dotenv.config();

import { Invoice } from '../entities/invoiceEntity';
import { InvoiceItem } from '../entities/invoiceItemEntity';
import { UsageRecord } from '../entities/usageRecordEntity';
import { ProductAllocation } from '../entities/productAllocationEntity';
import { ReturnCredit } from '../entities/returnCreditEntity';

import { logger } from './logger';
import { UsageRecordItem } from '../entities/usageRecordItemEntity';
import { DeviceMeterReading } from '../entities/deviceMeterReadingEntity';

export const Source = new DataSource({
  type: 'postgres',
  url: process.env.BILLING_DATABASE_URL,
  ssl: process.env.BILLING_DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
  synchronize: true,
  logging: false,
  entities: [
    Invoice,
    InvoiceItem,
    UsageRecord,
    ProductAllocation,
    UsageRecordItem,
    DeviceMeterReading,
    ReturnCredit,
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
 * Connects to the database with native exponential backoff retry logic.
 * - Prevents process.exit() crashing loop in PM2.
 * - Non-blocking to the Node.js event loop.
 * - Continuously retries until DB becomes available.
 */
export const connectWithRetry = async (initialDelayMs = 2000): Promise<DataSource> => {
  let attempt = 1;
  let delay = initialDelayMs;

  while (true) {
    try {
      if (!Source.isInitialized) {
        logger.info(`Attempting database connection (Attempt ${attempt})...`);
        await Source.initialize();
        logger.info('Database connected successfully.');
      }
      return Source;
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      logger.error(`Database connection failed on attempt ${attempt}: ${err.code || err.message}`);

      logger.info(`Waiting ${delay / 1000} seconds before retrying...`);
      // Wait safely without blocking Node loop
      await new Promise((resolve) => setTimeout(resolve, delay));

      attempt++;
      // Exponential backoff capped at 30 seconds
      delay = Math.min(delay * 2, 30000);
    }
  }
};
