import { Source } from '../config/dataSource';
import { logger } from '../config/logger';
import { CashBankAccount } from '../entities/cashBankAccountEntity';

import { PaymentTransaction } from '../entities/paymentTransactionEntity';
import { Invoice } from '../entities/invoiceEntity';
import { ExpenseEntry } from '../entities/expenseEntryEntity';
import { postCashbookEntry } from '../services/cashbookService';

async function main() {
  try {
    if (!Source.isInitialized) {
      await Source.initialize();
      logger.info('Database initialized');
    }

    // 1. Clear existing cashbook entries and cash bank accounts to avoid duplicates/stale links
    logger.info('Cleaning existing cashbook entries and cash bank accounts...');
    await Source.query('DELETE FROM cashbook_entries');
    await Source.query('DELETE FROM cash_bank_accounts CASCADE');
    logger.info('Cleaned successfully.');

    // 2. Seed default Cash and Bank accounts for the three branches
    const branches = [
      {
        id: 'f611ad69-8a40-4860-bd9b-509c06c832a7',
        name: 'xerocare pak',
        currency: 'PKR',
        cashName: 'Cash Account (PKR)',
        bankName: 'Bank Al Habib (PKR)',
        bankBrand: 'Bank Al Habib',
      },
      {
        id: '8ca6ebb5-2a97-491f-be83-69c5be25e6c1',
        name: 'xerocare llc dubai',
        currency: 'AED',
        cashName: 'Main Cash (AED)',
        bankName: 'Emirates NBD (AED)',
        bankBrand: 'Emirates NBD',
      },
      {
        id: '63bd6295-305c-4b29-b577-836676db0e30',
        name: 'xerocare llc',
        currency: 'AED',
        cashName: 'Main Cash (AED)',
        bankName: 'Emirates NBD (AED)',
        bankBrand: 'Emirates NBD',
      },
    ];

    const accountRepo = Source.getRepository(CashBankAccount);

    for (const br of branches) {
      logger.info(`Seeding accounts for branch ${br.name}...`);

      const cashAcc = accountRepo.create({
        name: br.cashName,
        type: 'CASH',
        branchId: br.id,
        currency: br.currency,
        openingBalance: 10000.0,
        currentBalance: 10000.0,
        isActive: true,
        isDefault: true,
        notes: `Default cash account for ${br.name}`,
      });

      const bankAcc = accountRepo.create({
        name: br.bankName,
        type: 'BANK',
        bankName: br.bankBrand,
        accountNumber: '1234-5678-90',
        branchId: br.id,
        currency: br.currency,
        openingBalance: 50000.0,
        currentBalance: 50000.0,
        accountType: 'CURRENT',
        isActive: true,
        isDefault: true,
        notes: `Default bank account for ${br.name}`,
      });

      await accountRepo.save(cashAcc);
      await accountRepo.save(bankAcc);
      logger.info(`Successfully seeded CASH and BANK accounts for ${br.name}`);
    }

    // 3. Backfill cashbook entries
    logger.info('Starting backfill for historical payment transactions...');
    const transactions = await Source.getRepository(PaymentTransaction).find();
    const invoiceRepo = Source.getRepository(Invoice);
    const invoiceCache = new Map<string, Invoice | null>();

    let receiptsPosted = 0;
    for (const tx of transactions) {
      let invoice = invoiceCache.get(tx.invoiceId);
      if (invoice === undefined) {
        invoice = await invoiceRepo.findOne({ where: { id: tx.invoiceId } });
        invoiceCache.set(tx.invoiceId, invoice);
      }
      if (!invoice?.branchId) continue;

      await postCashbookEntry({
        date: tx.transactionDate,
        entryType: 'RECEIPT',
        amount: Number(tx.amount),
        category: 'Customer Payment',
        branchId: invoice.branchId,
        createdBy: tx.recordedBy || '00000000-0000-0000-0000-000000000000',
        paymentMode: tx.paymentMode,
        autoResolveAccount: true,
        linkedInvoiceId: tx.invoiceId,
        description: `Receipt for invoice ${invoice.invoiceNumber}`,
        chequeNo: tx.referenceNumber,
        sourceType: 'INVOICE_PAYMENT',
        sourceId: tx.id,
      });
      receiptsPosted += 1;
    }
    logger.info(`Backfilled ${receiptsPosted} invoice receipt(s).`);

    logger.info('Starting backfill for historical paid expenses...');
    const paidExpenses = await Source.getRepository(ExpenseEntry).find({
      where: { status: 'PAID' },
    });
    let paymentsPosted = 0;
    for (const exp of paidExpenses) {
      await postCashbookEntry({
        date: exp.paymentDate ?? exp.date,
        entryType: 'PAYMENT',
        amount: Number(exp.netAmount),
        category: exp.category,
        branchId: exp.branchId,
        createdBy: exp.createdBy || 'SYSTEM',
        paymentMode: exp.paymentMode,
        accountId: exp.paidFrom,
        autoResolveAccount: true,
        linkedExpenseId: exp.id,
        description: exp.description,
        chequeNo: exp.referenceNo,
        notes: exp.notes,
        sourceType: 'EXPENSE',
        sourceId: exp.id,
      });
      paymentsPosted += 1;
    }
    logger.info(`Backfilled ${paymentsPosted} expense payment(s).`);

    logger.info('Seed and backfill script complete.');
  } catch (err) {
    logger.error('Error during seed and backfill operation:', err);
    process.exit(1);
  } finally {
    if (Source.isInitialized) {
      await Source.destroy();
    }
  }
}

main();
