import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
dotenv.config();

import { Invoice } from '../entities/invoiceEntity';
import { InvoiceItem } from '../entities/invoiceItemEntity';
import { UsageRecord } from '../entities/usageRecordEntity';
import { ProductAllocation } from '../entities/productAllocationEntity';

import { logger } from './logger';

/**
 * Neon DB specific fix: Avoid pooler instability.
 * The Neon connection pooler (indicated by "-pooler" in the hostname) can drop connections
 * during AWS network hiccups or proxy resets. Connecting directly to the compute node
 * avoids intermittent ENETUNREACH or ETIMEDOUT crashes.
 */
const getDirectDbUrl = (url?: string) => {
  if (!url) return '';
  return url.replace('-pooler.', '.');
};

export const Source = new DataSource({
  type: 'postgres',
  url: getDirectDbUrl(process.env.BILLING_DATABASE_URL),
  synchronize: false,
  logging: false, // Keep disabled in production to avoid clutter
  entities: [Invoice, InvoiceItem, UsageRecord, ProductAllocation],
  extra: {
    max: 1,
    // SSL is required by Neon.
    // rejectUnauthorized: false ensures docker doesn't fail due to missing local root certs.
    ssl: {
      rejectUnauthorized: false,
    },
    // Fails fast (5s) to trigger retries instead of hanging indefinitely
    connectionTimeoutMillis: 5000,
    // TCP keep-alive to safely handle silent network drops (AWS hiccups)
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
