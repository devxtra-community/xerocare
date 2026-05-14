import { Source } from '../config/dataSource';
import { logger } from '../config/logger';

async function resetData() {
  try {
    if (!Source.isInitialized) {
      await Source.initialize();
      logger.info('Database initialized');
    }

    const queryRunner = Source.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      logger.info('Starting data reset...');

      // Delete in reverse order of dependencies
      await queryRunner.query('DELETE FROM usage_record_items');
      await queryRunner.query('DELETE FROM usage_records');
      await queryRunner.query('DELETE FROM device_meter_readings');
      await queryRunner.query('DELETE FROM payment_ledgers');
      await queryRunner.query('DELETE FROM return_credits');
      await queryRunner.query('DELETE FROM product_allocations');
      await queryRunner.query('DELETE FROM invoice_items');
      await queryRunner.query('DELETE FROM invoices');

      await queryRunner.commitTransaction();
      logger.info('Data reset complete successfully.');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Data reset failed, transaction rolled back:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    logger.error('Error during resetData operation:', error);
    process.exit(1);
  } finally {
    if (Source.isInitialized) {
      await Source.destroy();
    }
  }
}

resetData();
