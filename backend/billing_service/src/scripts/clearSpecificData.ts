import { Source } from '../config/dataSource';
import { logger } from '../config/logger';

async function resetSpecificData() {
  try {
    logger.info('Initializing database connection for billing service...');
    await Source.initialize();
    logger.info('Database connected.');

    // We execute the queries in a transaction
    await Source.transaction(async (transactionalEntityManager) => {
      logger.info('Deleting selective data...');

      // 1. Delete usage_record_items related to targeted invoices
      await transactionalEntityManager.query(`
        DELETE FROM usage_record_items 
        WHERE "usageRecordId" IN (
            SELECT id FROM usage_records 
            WHERE "contractId" IN (
                SELECT id FROM invoices 
                WHERE "saleType" = 'SPAREPART_SALE' 
                   OR type IN ('QUOTATION', 'PROFORMA', 'FINAL')
            )
        )
      `);
      logger.info('Deleted related usage record items.');

      // 2. Delete usage_records related to targeted invoices
      await transactionalEntityManager.query(`
        DELETE FROM usage_records 
        WHERE "contractId" IN (
            SELECT id FROM invoices 
            WHERE "saleType" = 'SPAREPART_SALE' 
               OR type IN ('QUOTATION', 'PROFORMA', 'FINAL')
        )
      `);
      logger.info('Deleted related usage records.');

      // 3. Delete credit_notes related to targeted invoices
      await transactionalEntityManager.query(`
        DELETE FROM credit_notes 
        WHERE invoice_id IN (
            SELECT id FROM invoices 
            WHERE "saleType" = 'SPAREPART_SALE' 
               OR type IN ('QUOTATION', 'PROFORMA', 'FINAL')
        )
      `);
      logger.info('Deleted related credit notes.');

      // 4. Delete spare_part_credit_notes related to targeted invoices
      await transactionalEntityManager.query(`
        DELETE FROM spare_part_credit_notes 
        WHERE "invoiceReference" IN (
            SELECT "invoiceNumber" FROM invoices 
            WHERE "saleType" = 'SPAREPART_SALE' 
               OR type IN ('QUOTATION', 'PROFORMA', 'FINAL')
        )
      `);
      logger.info('Deleted related spare part credit notes.');

      // 5. Delete device_meter_readings related to targeted invoices
      await transactionalEntityManager.query(`
        DELETE FROM device_meter_readings 
        WHERE "invoiceId" IN (
            SELECT id FROM invoices 
            WHERE "saleType" = 'SPAREPART_SALE' 
               OR type IN ('QUOTATION', 'PROFORMA', 'FINAL')
        )
      `);
      logger.info('Deleted related device meter readings.');

      // 6. Delete cashbook_entries related to targeted invoices
      await transactionalEntityManager.query(`
        DELETE FROM cashbook_entries 
        WHERE "linkedInvoiceId" IN (
            SELECT id FROM invoices 
            WHERE "saleType" = 'SPAREPART_SALE' 
               OR type IN ('QUOTATION', 'PROFORMA', 'FINAL')
        )
      `);
      logger.info('Deleted related cashbook entries.');

      // 7. Delete receivable_payments related to targeted invoices
      await transactionalEntityManager.query(`
        DELETE FROM receivable_payments 
        WHERE "receivableId" IN (
            SELECT id FROM manual_receivables 
            WHERE "linkedInvoiceId" IN (
                SELECT id FROM invoices 
                WHERE "saleType" = 'SPAREPART_SALE' 
                   OR type IN ('QUOTATION', 'PROFORMA', 'FINAL')
            )
        )
      `);
      logger.info('Deleted related receivable payments.');

      // 8. Delete manual_receivables related to targeted invoices
      await transactionalEntityManager.query(`
        DELETE FROM manual_receivables 
        WHERE "linkedInvoiceId" IN (
            SELECT id FROM invoices 
            WHERE "saleType" = 'SPAREPART_SALE' 
               OR type IN ('QUOTATION', 'PROFORMA', 'FINAL')
        )
      `);
      logger.info('Deleted related manual receivables.');

      // 9. Delete invoices (cascades to invoice_items, product_allocations, return_credits, payment_ledgers, invoice_ledger, payment_transactions)
      await transactionalEntityManager.query(`
        DELETE FROM invoices 
        WHERE "saleType" = 'SPAREPART_SALE' 
           OR type IN ('QUOTATION', 'PROFORMA', 'FINAL')
      `);
      logger.info('Deleted invoices (quotations, orders, sparepart sales).');
    });

    logger.info('Selective data reset completed successfully.');
  } catch (err) {
    logger.error('Error resetting data:', err);
  } finally {
    if (Source.isInitialized) {
      await Source.destroy();
    }
  }
}

resetSpecificData();
