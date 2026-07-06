import { Source } from '../config/dataSource';
import { logger } from '../config/logger';
import { PaymentTransaction } from '../entities/paymentTransactionEntity';
import { Invoice } from '../entities/invoiceEntity';
import { ExpenseEntry } from '../entities/expenseEntryEntity';
import { postCashbookEntry } from '../services/cashbookService';

/**
 * One-time, idempotent backfill: create cashbook (day book) entries for historical
 * invoice receipts (payment_transactions) and paid expenses so the day book and
 * reports include data that pre-dates the auto-posting hooks.
 *
 * Safe to re-run — postCashbookEntry skips any (sourceType, sourceId) already posted.
 *   Run:  npx ts-node src/scripts/backfillCashbook.ts
 */
async function backfillCashbook() {
  try {
    if (!Source.isInitialized) {
      await Source.initialize();
      logger.info('Database initialized');
    }

    // ── Invoice receipts ──────────────────────────────────────────────────────
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
        createdBy: tx.recordedBy || 'SYSTEM',
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
    logger.info(
      `Backfilled ${receiptsPosted} invoice receipt(s) from ${transactions.length} transaction(s).`,
    );

    // ── Paid expenses ─────────────────────────────────────────────────────────
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

    logger.info('Cashbook backfill complete.');
  } catch (error) {
    logger.error('Error during backfillCashbook operation:', error);
    process.exit(1);
  } finally {
    if (Source.isInitialized) {
      await Source.destroy();
    }
  }
}

backfillCashbook();
