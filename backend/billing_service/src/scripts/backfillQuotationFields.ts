import { Source } from '../config/dataSource';
import { logger } from '../config/logger';

async function backfillQuotationFields() {
  try {
    if (!Source.isInitialized) {
      await Source.initialize();
      logger.info('Database initialized');
    }

    const queryRunner = Source.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      logger.info('Starting backfill for existing quotations...');

      // Update invoices that are quotations to set isTemplate = false, and assign them to their creators.
      const result = await queryRunner.query(`
        UPDATE invoices
        SET 
          "isTemplate" = false,
          "assignedEmployeeId" = "createdBy",
          "assignedAt" = "createdAt",
          "assignedBy" = "createdBy"
        WHERE 
          "type" = 'QUOTATION' 
          AND ("isTemplate" IS NULL OR "assignedEmployeeId" IS NULL)
      `);

      await queryRunner.commitTransaction();
      logger.info('Backfill complete successfully.', result);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Backfill failed, transaction rolled back:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    logger.error('Error during backfillQuotationFields operation:', error);
    process.exit(1);
  } finally {
    if (Source.isInitialized) {
      await Source.destroy();
    }
  }
}

backfillQuotationFields();
