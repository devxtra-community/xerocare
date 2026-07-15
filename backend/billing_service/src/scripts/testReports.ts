import { Source } from '../config/dataSource';
import { Invoice } from '../entities/invoiceEntity';
import { PaymentTransaction } from '../entities/paymentTransactionEntity';
import { ExpenseEntry } from '../entities/expenseEntryEntity';
import { computeProfitAndLoss } from '../utils/accountsShared';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { InvoiceType } from '../entities/enums/invoiceType';
import { SaleType } from '../entities/enums/saleType';
import { logger } from '../config/logger';

async function run() {
  try {
    logger.info('Connecting to database...');
    await Source.initialize();
    logger.info('Database connected.');

    const invRepo = Source.getRepository(Invoice);
    const payRepo = Source.getRepository(PaymentTransaction);
    const expRepo = Source.getRepository(ExpenseEntry);

    // Let's create some dummy data if we don't have any ACTIVE_CONTRACT invoices
    const activeInvoices = await invRepo.find({
      where: {
        status: InvoiceStatus.ACTIVE_CONTRACT,
        type: InvoiceType.PROFORMA,
      },
    });

    logger.info(
      `Found ${activeInvoices.length} active contracts/proforma invoices in the database.`,
    );

    if (activeInvoices.length === 0) {
      logger.info(
        'Creating a mock active rental contract (type PROFORMA, status ACTIVE_CONTRACT)...',
      );

      const mockInvoice = new Invoice();
      mockInvoice.invoiceNumber = 'QTN-2026-MOCK-' + Math.floor(Math.random() * 100000);
      mockInvoice.branchId = 'f611ad69-8a40-4860-bd9b-509c06c832a7';
      mockInvoice.createdBy = '9ec8bec1-6bab-4a20-bb76-dc312b83fc0b';
      mockInvoice.customerId = 'c0000000-0000-0000-0000-000000000001';
      mockInvoice.totalAmount = 1500.0;
      mockInvoice.grossAmount = 1500.0;
      mockInvoice.taxAmount = 75.0;
      mockInvoice.taxPercent = 5.0;
      mockInvoice.taxName = 'VAT';
      mockInvoice.status = InvoiceStatus.ACTIVE_CONTRACT;
      mockInvoice.saleType = SaleType.RENT;
      mockInvoice.type = InvoiceType.PROFORMA;
      mockInvoice.currencyCode = 'AED';

      const saved = await invRepo.save(mockInvoice);
      logger.info(`Mock invoice created: ${saved.id} (Number: ${saved.invoiceNumber})`);

      // Let's record a mock payment transaction for this invoice
      logger.info('Recording mock payment transaction...');
      const mockPay = new PaymentTransaction();
      mockPay.invoiceId = saved.id;
      mockPay.amount = 1500.0;
      mockPay.paymentMode = 'BANK_TRANSFER';
      mockPay.referenceNumber = 'REF-' + Math.floor(Math.random() * 100000);
      mockPay.remarks = 'Initial Rental Payment';
      mockPay.recordedBy = 'riyas';
      mockPay.currencyCode = 'AED';

      const savedPay = await payRepo.save(mockPay);
      logger.info(`Mock payment transaction created: ${savedPay.id}`);

      // Let's create a mock expense entry
      logger.info('Creating mock expense entry...');
      const mockExp = new ExpenseEntry();
      mockExp.expenseNo = 'EXP-MOCK-' + Math.floor(Math.random() * 100000);
      mockExp.date = new Date();
      mockExp.category = 'Rent & Operations';
      mockExp.subCategory = 'Office Rent';
      mockExp.description = 'Monthly Office Rent';
      mockExp.branchId = 'f611ad69-8a40-4860-bd9b-509c06c832a7';
      mockExp.amount = 500.0;
      mockExp.vatAmount = 25.0;
      mockExp.netAmount = 525.0;
      mockExp.currency = 'AED';
      mockExp.status = 'PAID';
      mockExp.paymentMode = 'BANK_TRANSFER';
      mockExp.createdBy = 'riyas';

      const savedExp = await expRepo.save(mockExp);
      logger.info(`Mock expense created: ${savedExp.id}`);
    }

    // Now, run computeProfitAndLoss
    logger.info('Computing Profit & Loss...');
    const result = await computeProfitAndLoss(
      Source,
      ['f611ad69-8a40-4860-bd9b-509c06c832a7'],
      '2026-01-01',
      '2026-12-31',
      'AED',
      'http://localhost:3004',
    );

    console.log('\n--- PROFIT & LOSS RESULT ---');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    logger.error('Error during testing:', error);
  } finally {
    await Source.destroy();
  }
}

run();
