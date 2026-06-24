import { Source } from '../config/db';
import { logger } from '../config/logger';

async function resetData() {
  try {
    logger.info('Initializing database connection for ven_inv service...');
    await Source.initialize();
    logger.info('Database connected.');

    const tables = [
      'service_ticket_items',
      'service_tickets',
      'purchase_payments',
      'purchase_costs',
      'purchases',
      'rfq_vendor_items',
      'rfq_vendors',
      'rfq_items',
      'rfqs',
    ];

    logger.info('Clearing tables in ven_inv service...');
    for (const table of tables) {
      try {
        await Source.query(`TRUNCATE TABLE "${table}" CASCADE;`);
        logger.info(`Truncated table: ${table}`);
      } catch (err) {
        logger.warn(`Could not truncate table ${table}: ${(err as Error).message}`);
      }
    }

    logger.info('Data reset completed for ven_inv service.');
  } catch (err) {
    logger.error('Error resetting data:', err);
  } finally {
    if (Source.isInitialized) {
      await Source.destroy();
    }
  }
}

resetData();
