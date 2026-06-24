import { Source } from '../config/db';
import { logger } from '../config/logger';

async function resetStock() {
  try {
    await Source.initialize();
    logger.info('Resetting all products to AVAILABLE status...');
    await Source.query(`UPDATE "products" SET "product_status" = 'AVAILABLE';`);
    logger.info('All products reset to AVAILABLE.');
  } catch (err) {
    logger.error('Error:', err);
  } finally {
    await Source.destroy();
  }
}

resetStock();
