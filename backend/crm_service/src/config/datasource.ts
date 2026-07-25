import 'reflect-metadata';
import { DataSource } from 'typeorm';
import './env';
import { Customer } from '../entities/customerEntity';
import { logger } from './logger';

export const Source = new DataSource({
  type: 'postgres',
  url: process.env.CRM_DATABASE_URL,
  ssl: process.env.CRM_DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: false,
  entities: [Customer],
  poolSize: 1,
  extra: {
    max: 1,
    min: 0,
    connectionTimeoutMillis: 5000,
    keepAlive: true,
    idleTimeoutMillis: 30000,
    statement_timeout: 10000,
  },
});

async function runPreMigrations(): Promise<void> {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: process.env.CRM_DATABASE_URL });
  try {
    await client.connect();
    // ─── customers: city column (3-tier location hierarchy) ──────────────────
    await client.query(`
      ALTER TABLE customers
        ADD COLUMN IF NOT EXISTS city VARCHAR(100) NULL;
    `);
    logger.info('CRM pre-migration: customers.city column ensured.');

    // ─── customers: VAT status + exemption reason ─────────────────────────────
    // Default UNREGISTERED_STANDARD preserves pre-existing tax behavior (standard
    // VAT still applies) for every customer that existed before this column did.
    await client.query(`
      ALTER TABLE customers
        ADD COLUMN IF NOT EXISTS vat_status VARCHAR(30) NOT NULL DEFAULT 'UNREGISTERED_STANDARD',
        ADD COLUMN IF NOT EXISTS exemption_reason VARCHAR(60) NULL;
    `);
    logger.info('CRM pre-migration: customers.vat_status/exemption_reason columns ensured.');

    // ─── customers: audit trail columns ───────────────────────────────────
    await client.query(`
      ALTER TABLE customers
        ADD COLUMN IF NOT EXISTS created_by UUID NULL,
        ADD COLUMN IF NOT EXISTS updated_by UUID NULL;
    `);
    logger.info('CRM pre-migration: customers audit columns ensured.');
  } catch (err) {
    logger.error('CRM pre-migration failed:', err);
    throw err;
  } finally {
    await client.end();
  }
}

export const connectWithRetry = async (initialDelayMs = 2000): Promise<DataSource> => {
  let attempt = 1;
  let delay = initialDelayMs;

  while (true) {
    try {
      if (!Source.isInitialized) {
        const isNeon = process.env.CRM_DATABASE_URL?.includes('neon.tech');
        logger.info(
          `Attempting database connection (Attempt ${attempt})... [SSL: ${isNeon ? 'ON' : 'OFF'}]`,
        );
        await runPreMigrations();
        await Source.initialize();
        logger.info('Database connected successfully.');

        // Fresh database (no customers table yet): create the schema from entities.
        const customersTable = await Source.query(`SELECT to_regclass('public.customers') AS tbl;`);
        if (!customersTable[0].tbl) {
          logger.info('Fresh database — creating schema from entities via synchronize...');
          await Source.synchronize();
          logger.info('Schema created from entities.');
        } else {
          // Existing database: additive columns for older deployments.
          await Source.query(
            `ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_accounts JSONB DEFAULT '[]';`,
          );
        }
      }
      return Source;
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      logger.error(`Database connection failed on attempt ${attempt}: ${err.code || err.message}`);
      logger.info(`Waiting ${delay / 1000} seconds before retrying...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
      delay = Math.min(delay * 2, 30000);
    }
  }
};
