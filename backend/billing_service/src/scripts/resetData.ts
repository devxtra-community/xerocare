import { Source } from '../config/dataSource';
import { logger } from '../config/logger';

async function resetData() {
  try {
    logger.info('Initializing database connection for billing service...');
    await Source.initialize();
    logger.info('Database connected.');

    const tables = [
      'credit_notes',
      'return_credits',
      'invoice_items',
      'product_allocations',
      'payment_ledger',
      'usage_record_items',
      'usage_records',
      'device_meter_readings',
      'invoices',
      'quotation_template_assignments',
      'audit_logs',
    ];

    logger.info('Clearing tables in billing service...');
    for (const table of tables) {
      try {
        await Source.query(`TRUNCATE TABLE "${table}" CASCADE;`);
        logger.info(`Truncated table: ${table}`);
      } catch (err) {
        logger.warn(`Could not truncate table ${table}: ${(err as Error).message}`);
      }
    }

    logger.info('Data reset completed for billing service.');
  } catch (err) {
    logger.error('Error resetting data:', err);
  } finally {
    if (Source.isInitialized) {
      await Source.destroy();
    }
  }
}

resetData();
