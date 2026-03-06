import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
dotenv.config();

import { Invoice } from '../entities/invoiceEntity';
import { InvoiceItem } from '../entities/invoiceItemEntity';
import { UsageRecord } from '../entities/usageRecordEntity';
import { ProductAllocation } from '../entities/productAllocationEntity';
import { DeviceMeterReading } from '../entities/deviceMeterReadingEntity';
import { UsageRecordItem } from '../entities/usageRecordItemEntity';
import { logger } from './logger';

export const Source = new DataSource({
  type: 'postgres',
  url: process.env.BILLING_DATABASE_URL || process.env.DATABASE_URL,
  synchronize: true,
  logging: false,
  entities: [
    Invoice,
    InvoiceItem,
    UsageRecord,
    ProductAllocation,
    DeviceMeterReading,
    UsageRecordItem,
  ],
  extra: { max: 2 },
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
