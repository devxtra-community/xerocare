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
        createdBy: exp.createdBy || '00000000-0000-0000-0000-000000000000',
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

    // ── Legacy payment_ledgers receipts (old /payments/record + old direct sales) ──
    const { PaymentLedger } = await import('../entities/paymentLedgerEntity');
    const legacyPayments = await Source.getRepository(PaymentLedger).find();
    let legacyPosted = 0;
    for (const lp of legacyPayments) {
      let invoice = invoiceCache.get(lp.invoiceId);
      if (invoice === undefined) {
        invoice = await invoiceRepo.findOne({ where: { id: lp.invoiceId } });
        invoiceCache.set(lp.invoiceId, invoice);
      }
      if (!invoice?.branchId) continue;

      await postCashbookEntry({
        date: lp.paymentDate,
        entryType: 'RECEIPT',
        amount: Number(lp.amountPaid),
        category: 'Customer Payment',
        branchId: invoice.branchId,
        createdBy: lp.recordedBy || '00000000-0000-0000-0000-000000000000',
        paymentMode: lp.paymentMode,
        autoResolveAccount: true,
        linkedInvoiceId: lp.invoiceId,
        description: `Receipt for invoice ${invoice.invoiceNumber}`,
        chequeNo: lp.referenceNumber,
        sourceType: 'INVOICE_PAYMENT',
        sourceId: lp.id,
      });
      legacyPosted += 1;
    }
    logger.info(`Backfilled ${legacyPosted} legacy payment-ledger receipt(s).`);

    // ── Manual receivable collections ─────────────────────────────────────────
    const { ReceivablePayment } = await import('../entities/receivablePaymentEntity');
    const { ManualReceivable } = await import('../entities/manualReceivableEntity');
    const receivablePayments = await Source.getRepository(ReceivablePayment).find();
    const receivableRepo = Source.getRepository(ManualReceivable);
    let receivablePosted = 0;
    for (const rp of receivablePayments) {
      const receivable = await receivableRepo.findOne({ where: { id: rp.receivableId } });
      if (!receivable?.branchId) continue;
      await postCashbookEntry({
        date: rp.paymentDate,
        entryType: 'RECEIPT',
        amount: Number(rp.amount),
        category: 'Receivable Collection',
        branchId: receivable.branchId,
        createdBy: rp.createdBy || '00000000-0000-0000-0000-000000000000',
        paymentMode: rp.paymentMode,
        accountId: rp.paidToAccount,
        autoResolveAccount: true,
        description: `Receipt against receivable ${receivable.customerName || receivable.id}`,
        chequeNo: rp.referenceNo,
        notes: rp.notes,
        sourceType: 'RECEIVABLE_PAYMENT',
        sourceId: rp.id,
      });
      receivablePosted += 1;
    }
    logger.info(`Backfilled ${receivablePosted} receivable collection(s).`);

    // ── Manual payable settlements ────────────────────────────────────────────
    const { PayablePayment } = await import('../entities/payablePaymentEntity');
    const { ManualPayable } = await import('../entities/manualPayableEntity');
    const payablePayments = await Source.getRepository(PayablePayment).find();
    const payableRepo = Source.getRepository(ManualPayable);
    let payablePosted = 0;
    for (const pp of payablePayments) {
      const payable = await payableRepo.findOne({ where: { id: pp.payableId } });
      if (!payable?.branchId) continue;
      await postCashbookEntry({
        date: pp.paymentDate,
        entryType: 'PAYMENT',
        amount: Number(pp.amount),
        category: 'Payable Settlement',
        branchId: payable.branchId,
        createdBy: pp.createdBy || '00000000-0000-0000-0000-000000000000',
        paymentMode: pp.paymentMode,
        accountId: pp.paidFromAccount,
        autoResolveAccount: true,
        description: `Payment against payable ${payable.referenceNo || payable.id}`,
        chequeNo: pp.referenceNo,
        notes: pp.notes,
        sourceType: 'PAYABLE_PAYMENT',
        sourceId: pp.id,
      });
      payablePosted += 1;
    }
    logger.info(`Backfilled ${payablePosted} payable settlement(s).`);

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
