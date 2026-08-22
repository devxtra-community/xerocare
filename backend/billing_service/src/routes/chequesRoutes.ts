import { Router } from 'express';
import axios from 'axios';
import { In } from 'typeorm';
import { Source } from '../config/dataSource';
import { AppError } from '../errors/appError';
import { Cheque } from '../entities/chequeEntity';
import { ChequeStatusHistory } from '../entities/chequeStatusHistoryEntity';
import { CashbookEntry } from '../entities/cashbookEntryEntity';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
import { Invoice } from '../entities/invoiceEntity';
import { InvoiceLedger } from '../entities/invoiceLedgerEntity';
import { PaymentTransaction } from '../entities/paymentTransactionEntity';
import { SalePaymentRequest } from '../entities/salePaymentRequestEntity';
import { EmployeeExpenseRequest } from '../entities/employeeExpenseRequestEntity';
import { ExpenseEntry } from '../entities/expenseEntryEntity';
import { requireCashAccount } from '../services/cashbookService';
import { applyBranchQB } from '../middlewares/branchFilterMiddleware';
import { getBranchManager } from '../services/billingHelpers';
import { logger } from '../config/logger';
import { sign } from 'jsonwebtoken';

const router = Router();

function makeServiceToken() {
  return sign({ userId: 'billing_service', role: 'ADMIN' }, process.env.ACCESS_SECRET as string, {
    expiresIn: '1m',
  });
}

async function sendNotification(employeeId: string, title: string, message: string) {
  try {
    await axios.post(
      'http://localhost:3002/notifications/internal',
      { employee_id: employeeId, title, message, type: 'INFO' },
      { headers: { 'x-internal-service': 'billing' }, timeout: 3000 },
    );
  } catch {
    logger.warn('[cheques] Notification send failed (non-fatal)');
  }
}

async function sendNotifications(employeeIds: string[], title: string, message: string) {
  const uniqueEmployeeIds = [...new Set(employeeIds.filter(Boolean))];
  await Promise.all(
    uniqueEmployeeIds.map((employeeId) => sendNotification(employeeId, title, message)),
  );
}

function logHistory(
  manager: import('typeorm').EntityManager,
  chequeId: string,
  fromStatus: string | undefined,
  toStatus: string,
  changedBy: string,
  notes?: string,
) {
  const histRepo = manager.getRepository(ChequeStatusHistory);
  const h = histRepo.create({ chequeId, fromStatus, toStatus, changedBy, notes });
  return histRepo.save(h);
}

/**
 * A RECEIVED cheque tied to a Sale/Rent/Lease invoice already credited that
 * invoice's Paid figure the moment Finance approved the originating
 * SalePaymentRequest — well before the cheque is even deposited, let alone
 * cleared (approveSalePayment updates InvoiceLedger + creates the
 * PaymentTransaction unconditionally, then only additionally creates the Cheque
 * row for CHEQUE mode). Bounce and Cancel both end that cheque's life without
 * ever presenting for payment, so both must undo that credit — otherwise the
 * invoice is left permanently showing money that was never actually received.
 *
 * Reverses via an offsetting negative PaymentTransaction rather than mutating or
 * deleting the original, mirroring this codebase's existing
 * CashbookEntry.isReversed/reversedById convention (see reverseCashbookEntry in
 * accountsController.ts) — full audit trail, and the negative amount nets out
 * correctly wherever a payment total is summed (getAccountSummary, AR reports)
 * without those call sites needing to know reversals exist.
 *
 * No-ops safely for: ISSUED cheques (never touch AR), cheques not linked to an
 * invoice, cheques whose originating request can't be found (manually-created
 * cheque via POST /cheques, not routed through a SalePaymentRequest), or a
 * request with no paymentTransactionId (shouldn't happen for an APPROVED
 * CHEQUE-mode request, but this must never throw and block the status change
 * itself over a reversal it can't perform).
 */
async function reverseInvoiceCreditForCheque(
  manager: import('typeorm').EntityManager,
  cheque: Cheque,
  userId: string,
  reason: string,
): Promise<void> {
  if (cheque.type !== 'RECEIVED' || !cheque.sourceReferenceId) return;
  if (!['SALE', 'RENT', 'LEASE'].includes(cheque.sourceType ?? '')) return;

  try {
    const sprRepo = manager.getRepository(SalePaymentRequest);
    const spr = await sprRepo.findOne({
      where: {
        invoiceId: cheque.sourceReferenceId,
        chequeNumber: cheque.chequeNo,
        status: 'APPROVED',
      },
    });
    if (!spr?.paymentTransactionId) return;

    const txnRepo = manager.getRepository(PaymentTransaction);
    const original = await txnRepo.findOne({ where: { id: spr.paymentTransactionId } });
    if (!original || original.isReversed) return;

    const reversal = txnRepo.create({
      invoiceId: original.invoiceId,
      transactionDate: new Date(),
      paymentMode: original.paymentMode,
      referenceNumber: `REV-${cheque.chequeNo}`,
      amount: -Number(original.amount),
      recordedBy: userId,
      remarks: `Reversal — cheque #${cheque.chequeNo} ${reason}`,
      currencyCode: original.currencyCode,
    });
    const savedReversal = await txnRepo.save(reversal);
    original.isReversed = true;
    original.reversedById = savedReversal.id;
    await txnRepo.save(original);

    // Recompute paidAmount as the actual sum of this invoice's transactions —
    // matching connectWithRetry's own invoice_ledger reconciliation logic — rather
    // than decrementing, so this self-corrects even if paidAmount had already
    // drifted for any other reason.
    const ledgerRepo = manager.getRepository(InvoiceLedger);
    const ledger = await ledgerRepo.findOne({ where: { invoiceId: cheque.sourceReferenceId } });
    if (ledger) {
      const invoiceRepo = manager.getRepository(Invoice);
      const inv = await invoiceRepo.findOne({ where: { id: cheque.sourceReferenceId } });
      const totalAmount = inv ? Number(inv.totalAmount) : Number(ledger.totalAmount);

      const allTxns = await txnRepo.find({ where: { invoiceId: cheque.sourceReferenceId } });
      const paidAmount = allTxns
        .filter((t) => (t.remarks ?? '').trim().toLowerCase() !== 'security deposit')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      ledger.totalAmount = totalAmount;
      ledger.paidAmount = Math.max(0, paidAmount);
      ledger.balanceAmount = Math.max(0, totalAmount - ledger.paidAmount);
      await ledgerRepo.save(ledger);
    }
  } catch (err) {
    // A failed reversal must never block the Bounce/Cancel status change itself —
    // that would leave a dishonored cheque stuck as still-active. Logged for
    // Finance to reconcile manually if this ever fires.
    logger.error(
      `[cheques] Failed to reverse invoice credit for cheque ${cheque.id} (${reason}):`,
      err,
    );
  }
}

/**
 * Enrich INVOICE-sourced cheques with the source invoice's saleType (SALE / RENT /
 * LEASE …) and the matching cheque payment's receiptUrl (payment proof upload).
 */
async function enrichChequesWithInvoiceDetails<T extends Cheque>(
  cheques: T[],
): Promise<(T & { saleType?: string | null; receiptUrl?: string | null })[]> {
  const invoiceIds = [
    ...new Set(
      cheques
        .filter((c) => c.sourceType === 'INVOICE' && c.sourceReferenceId)
        .map((c) => c.sourceReferenceId as string),
    ),
  ];
  if (invoiceIds.length === 0) return cheques;

  const [invoices, chequeTxs] = await Promise.all([
    Source.getRepository(Invoice).find({
      where: { id: In(invoiceIds) },
      select: ['id', 'saleType'],
    }),
    Source.getRepository(PaymentTransaction).find({
      where: { invoiceId: In(invoiceIds) },
      order: { createdAt: 'DESC' },
    }),
  ]);
  const saleTypeMap = new Map(invoices.map((i) => [i.id, i.saleType as string]));

  return cheques.map((c) => {
    if (c.sourceType !== 'INVOICE' || !c.sourceReferenceId) return c;
    const txsForInvoice = chequeTxs.filter(
      (t) =>
        t.invoiceId === c.sourceReferenceId && (t.paymentMode ?? '').toUpperCase() === 'CHEQUE',
    );
    // Best match: same cheque/reference number; fall back to same amount.
    const tx =
      txsForInvoice.find((t) => t.referenceNumber && t.referenceNumber === c.chequeNo) ??
      txsForInvoice.find((t) => Number(t.amount) === Number(c.amount)) ??
      txsForInvoice[0];
    return {
      ...c,
      saleType: saleTypeMap.get(c.sourceReferenceId) ?? null,
      receiptUrl: tx?.receiptUrl ?? null,
    };
  });
}

/**
 * Attach the reason for the most recent BOUNCED/CANCELLED status change (Part 3.3) —
 * so Finance can see why without opening the full history. No-op for cheques not in
 * a terminal-with-reason state.
 */
async function enrichChequesWithTerminalReason<T extends Cheque>(
  cheques: T[],
): Promise<(T & { reason?: string | null })[]> {
  const terminalIds = cheques
    .filter((c) => c.status === 'BOUNCED' || c.status === 'CANCELLED')
    .map((c) => c.id);
  if (terminalIds.length === 0) return cheques;

  const rows = await Source.getRepository(ChequeStatusHistory)
    .createQueryBuilder('h')
    .where('h.chequeId IN (:...ids)', { ids: terminalIds })
    .andWhere('h.toStatus IN (:...statuses)', { statuses: ['BOUNCED', 'CANCELLED'] })
    .orderBy('h.changedAt', 'DESC')
    .getMany();

  const reasonByChequeId = new Map<string, string | null>();
  for (const row of rows) {
    if (!reasonByChequeId.has(row.chequeId)) reasonByChequeId.set(row.chequeId, row.notes ?? null);
  }

  return cheques.map((c) => ({ ...c, reason: reasonByChequeId.get(c.id) ?? null }));
}

/** Resolve branchIds filter — admin may pass ?branchIds=id1,id2; non-admin locked to own branch. */
function resolveBranchFilter(req: import('express').Request): string[] {
  const isAdmin = req.user?.role === 'ADMIN';
  if (isAdmin && req.query.branchIds) {
    return String(req.query.branchIds)
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);
  }
  return req.user?.branchId ? [req.user.branchId] : [];
}

// ── GET / — list cheques ──────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const branchIds = resolveBranchFilter(req);
    if (branchIds.length === 0) {
      return res.json({ success: true, data: [] });
    }
    const { status, type, search, dateFrom, dateTo } = req.query;

    const repo = Source.getRepository(Cheque);
    const qb = repo
      .createQueryBuilder('c')
      .where('c.branchId IN (:...branchIds)', { branchIds })
      .orderBy('c.dueDate', 'ASC');

    if (status && status !== 'ALL') qb.andWhere('c.status = :status', { status });
    if (type && type !== 'ALL') qb.andWhere('c.type = :type', { type });
    if (search) {
      qb.andWhere(
        '(c.chequeNo ILIKE :s OR c.partyName ILIKE :s OR c.bankName ILIKE :s OR c.invoiceNo ILIKE :s OR c.sourceLabel ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    if (dateFrom) qb.andWhere('c.dueDate >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('c.dueDate <= :dateTo', { dateTo });

    const cheques = await qb.getMany();
    const withInvoiceDetails = await enrichChequesWithInvoiceDetails(cheques);
    const enriched = await enrichChequesWithTerminalReason(withInvoiceDetails);
    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

// ── GET /summary — counts and amounts by status ───────────────────────────────
router.get('/summary', async (req, res, next) => {
  try {
    const branchIds = resolveBranchFilter(req);
    if (branchIds.length === 0) {
      return res.json({ success: true, data: {} });
    }
    const placeholders = branchIds.map((_, i) => `$${i + 1}`).join(',');
    const rows = await Source.query<
      { status: string; type: string; count: string; total: string }[]
    >(
      `SELECT status, type, COUNT(*) AS count, COALESCE(SUM(amount),0) AS total
       FROM cheques WHERE branch_id IN (${placeholders})
       GROUP BY status, type`,
      branchIds,
    );
    // Shape: { RECEIVED: { PENDING: { count, total }, ... }, ISSUED: {...} }
    const summary: Record<string, Record<string, { count: number; total: number }>> = {
      RECEIVED: {},
      ISSUED: {},
    };
    for (const r of rows) {
      const dir = r.type === 'ISSUED' ? 'ISSUED' : 'RECEIVED';
      summary[dir][r.status] = { count: parseInt(r.count, 10), total: parseFloat(r.total) };
    }
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
});

// ── GET /notifications — due within 3 days or overdue ─────────────────────────
router.get('/notifications', async (req, res, next) => {
  try {
    const branchIds = resolveBranchFilter(req);
    if (branchIds.length === 0) {
      return res.json({ success: true, data: [], count: 0 });
    }
    const placeholders = branchIds.map((_, i) => `$${i + 1}`).join(',');
    const rows = await Source.query<Cheque[]>(
      // Remind on BOTH dates, not just the due date. cheque_date is the date written on
      // the cheque — for a post-dated cheque it is the day it becomes presentable, and it
      // can fall well before the due date. Keying the reminder solely off due_date meant a
      // cheque becoming presentable in two days produced no warning at all, which is half
      // the point of the reminder. Ordered by whichever of the two lands first.
      `SELECT * FROM cheques
       WHERE branch_id IN (${placeholders})
         AND status IN ('PENDING', 'ISSUED')
         AND (
           due_date <= CURRENT_DATE + INTERVAL '3 days'
           OR (cheque_date IS NOT NULL AND cheque_date <= CURRENT_DATE + INTERVAL '3 days')
         )
       ORDER BY LEAST(due_date, COALESCE(cheque_date, due_date)) ASC
       LIMIT 20`,
      branchIds,
    );
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id — single cheque with history ─────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const repo = Source.getRepository(Cheque);
    const qb = repo.createQueryBuilder('c').where('c.id = :id', { id: req.params.id });
    // req.branchFilter (set by parseBranchFilter) — [] means ADMIN viewing all
    // branches, which must be a no-op filter here, not an empty IN() clause
    // (TypeORM throws on `IN (:...x)` with an empty array). Non-admin roles are
    // always locked to their own branchId, so this stays branch-safe.
    applyBranchQB(qb, 'c', req.branchFilter ?? []);
    const cheque = await qb.getOne();
    if (!cheque) throw new AppError('Cheque not found', 404);

    const history = await Source.getRepository(ChequeStatusHistory).find({
      where: { chequeId: cheque.id },
      order: { changedAt: 'ASC' },
    });

    const [withInvoiceDetails] = await enrichChequesWithInvoiceDetails([cheque]);
    const [enriched] = await enrichChequesWithTerminalReason([withInvoiceDetails]);
    res.json({ success: true, data: { ...enriched, history } });
  } catch (err) {
    next(err);
  }
});

// ── POST / — create cheque ────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const branchId = req.user!.branchId;
    const userId = req.user!.userId;
    const {
      chequeNo,
      bankName,
      partyName,
      amount,
      dueDate,
      chequeDate,
      issueDate,
      type,
      description,
      accountId,
      sourceType,
      sourceReferenceId,
      sourceLabel,
      invoiceNo,
    } = req.body;

    if (!chequeNo) throw new AppError('Cheque number is required', 400);
    if (!partyName) throw new AppError('Party name is required', 400);
    if (!amount || Number(amount) <= 0) throw new AppError('Amount must be > 0', 400);
    if (!dueDate) throw new AppError('Due date is required', 400);

    // A cheque must say what it is settling. Clearing one moves Cash at Bank, and the
    // other half of that entry comes from the source document — the invoice receivable it
    // pays down, or the purchase/expense payable it settles. Created without a source, a
    // cleared cheque credited cash with no counterpart anywhere and broke
    // Assets = Liabilities + Equity by its own amount.
    // Every real flow already supplies this (sale payments send SALE + invoiceId, purchase
    // payments send PURCHASE + purchaseId, and so on) — this endpoint was simply the one
    // path that let it be omitted.
    if (!sourceType || !sourceReferenceId) {
      throw new AppError(
        'A cheque must be linked to what it settles: provide sourceType (e.g. SALE, RENT, LEASE, PURCHASE, EXPENSE) and sourceReferenceId.',
        400,
      );
    }

    const repo = Source.getRepository(Cheque);

    const existing = await repo.findOne({ where: { chequeNo, branchId } });
    if (existing)
      throw new AppError('A cheque with this number already exists in this branch', 400);

    const cheque = repo.create({
      chequeNo,
      bankName,
      partyName,
      amount: Number(amount),
      dueDate,
      // Cheque Date defaults to Due Date only when truly omitted (legacy callers that
      // don't yet send it) — the date physically written on the cheque, independent of
      // Due Date so a post-dated cheque (chequeDate < dueDate) is captured correctly.
      chequeDate: chequeDate || dueDate,
      issueDate: issueDate || undefined,
      type: type || 'RECEIVED',
      status: 'PENDING',
      description,
      branchId,
      accountId: accountId || undefined,
      sourceType: sourceType || undefined,
      sourceReferenceId: sourceReferenceId || undefined,
      sourceLabel: sourceLabel || undefined,
      invoiceNo: invoiceNo || undefined,
      createdBy: userId,
    });
    const saved = await repo.save(cheque);

    await Source.transaction(async (m) => {
      await logHistory(m, saved.id, undefined, 'PENDING', userId, 'Cheque created');
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /:id — edit cheque (PENDING only) ───────────────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const branchId = req.user!.branchId;
    const repo = Source.getRepository(Cheque);
    const cheque = await repo.findOne({ where: { id: req.params.id, branchId } });
    if (!cheque) throw new AppError('Cheque not found', 404);
    if (cheque.status !== 'PENDING') throw new AppError('Only PENDING cheques can be edited', 400);

    const {
      chequeNo,
      bankName,
      partyName,
      amount,
      dueDate,
      chequeDate,
      issueDate,
      description,
      accountId,
    } = req.body;

    if (chequeNo !== undefined) cheque.chequeNo = chequeNo;
    if (bankName !== undefined) cheque.bankName = bankName;
    if (partyName !== undefined) cheque.partyName = partyName;
    if (amount !== undefined) cheque.amount = Number(amount);
    if (dueDate !== undefined) cheque.dueDate = dueDate;
    if (chequeDate !== undefined) cheque.chequeDate = chequeDate;
    if (issueDate !== undefined) cheque.issueDate = issueDate;
    if (description !== undefined) cheque.description = description;
    if (accountId !== undefined) cheque.accountId = accountId;

    const updated = await repo.save(cheque);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/deposit — deposit RECEIVED cheque; status change ONLY ───────────
// Symmetric rule (confirmed): both RECEIVED and ISSUED cheques move Cash at Bank
// only at CLEAR — an uncleared cheque isn't yet confirmed bank funds and could still
// bounce. Deposit just records which account it'll hit once cleared.
router.post('/:id/deposit', async (req, res, next) => {
  try {
    const branchId = req.user!.branchId;
    const userId = req.user!.userId;
    const { accountId, depositDate, notes } = req.body;

    if (!accountId) throw new AppError('Bank account is required for deposit', 400);

    const chequeRepo = Source.getRepository(Cheque);
    const cheque = await chequeRepo.findOne({ where: { id: req.params.id, branchId } });
    if (!cheque) throw new AppError('Cheque not found', 404);
    if (cheque.type !== 'RECEIVED')
      throw new AppError('Only RECEIVED cheques can be deposited', 400);
    if (cheque.status !== 'PENDING')
      throw new AppError('Only PENDING cheques can be deposited', 400);

    // The account must be real, belong to this branch, and be a BANK account — a
    // stale/foreign/wrong-type id must never be silently accepted here, since it's
    // this very id that /clear later trusts blindly to move Cash at Bank.
    await requireCashAccount(Source, {
      branchId,
      explicitAccountId: accountId,
      requiredType: 'BANK',
      actionLabel: 'depositing/clearing cheques',
    });

    await Source.transaction(async (m) => {
      const chqRepo = m.getRepository(Cheque);

      // Record which account will be credited when cleared — no balance movement yet.
      cheque.status = 'DEPOSITED';
      cheque.accountId = accountId;
      cheque.depositDate = depositDate ? new Date(depositDate) : (new Date() as unknown as Date);
      await chqRepo.save(cheque);
      await logHistory(m, cheque.id, 'PENDING', 'DEPOSITED', userId, notes);
    });

    await sendNotification(
      userId,
      'Cheque Deposited',
      `Cheque #${cheque.chequeNo} from ${cheque.partyName} deposited — Cash at Bank updates once it clears.`,
    );
    res.json({ success: true, data: cheque });
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/issue — hand cheque to vendor (no balance yet) ─────────────────
// Cash at Bank decreases only when cheque is later CLEARED.
router.post('/:id/issue', async (req, res, next) => {
  try {
    const branchId = req.user!.branchId;
    const userId = req.user!.userId;
    const { accountId, issueDate, notes } = req.body;

    if (!accountId) throw new AppError('Bank account is required to issue cheque', 400);

    const chequeRepo = Source.getRepository(Cheque);
    const cheque = await chequeRepo.findOne({ where: { id: req.params.id, branchId } });
    if (!cheque) throw new AppError('Cheque not found', 404);
    if (cheque.type !== 'ISSUED') throw new AppError('Only ISSUED-type cheques can be issued', 400);
    if (cheque.status !== 'PENDING') throw new AppError('Only PENDING cheques can be issued', 400);

    // Same reasoning as /deposit — /clear later trusts this id blindly.
    await requireCashAccount(Source, {
      branchId,
      explicitAccountId: accountId,
      requiredType: 'BANK',
      actionLabel: 'depositing/clearing cheques',
    });

    await Source.transaction(async (m) => {
      const chqRepo = m.getRepository(Cheque);
      // Record which account will be debited when cleared — no balance movement yet
      cheque.status = 'ISSUED';
      cheque.accountId = accountId;
      cheque.issueDate = issueDate ? new Date(issueDate) : (new Date() as unknown as Date);
      await chqRepo.save(cheque);
      await logHistory(m, cheque.id, 'PENDING', 'ISSUED', userId, notes);
    });

    res.json({ success: true, data: cheque });
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/clear — confirm clearing; Cash at Bank moves NOW, both directions ──
// Symmetric rule (confirmed): RECEIVED → Cash at Bank increases at Clear.
//                              ISSUED   → Cash at Bank decreases at Clear.
// Neither Deposit nor Issue moves the balance — only a confirmed Clear does.
router.post('/:id/clear', async (req, res, next) => {
  try {
    const branchId = req.user!.branchId;
    const userId = req.user!.userId;
    const { notes, clearedDate } = req.body;

    const repo = Source.getRepository(Cheque);
    const cheque = await repo.findOne({ where: { id: req.params.id, branchId } });
    if (!cheque) throw new AppError('Cheque not found', 404);
    if (!['DEPOSITED', 'ISSUED'].includes(cheque.status)) {
      throw new AppError('Only DEPOSITED or ISSUED cheques can be cleared', 400);
    }

    const prevStatus = cheque.status;

    // Re-validate the account /deposit or /issue recorded — it must still exist,
    // still belong to this branch, and still be a BANK account. Previously this
    // trusted cheque.accountId blindly and used increment()/decrement(), which
    // silently no-ops (no error, 0 rows affected) against a stale/removed account —
    // the cheque would still clear with zero real cash movement.
    if (!cheque.accountId) {
      throw new AppError(
        'This cheque has no bank account on file — it cannot be cleared. Re-open it via Deposit/Issue and select a valid Bank account first.',
        400,
      );
    }
    const targetAccount = await requireCashAccount(Source, {
      branchId,
      explicitAccountId: cheque.accountId,
      requiredType: 'BANK',
      actionLabel: 'depositing/clearing cheques',
    });

    await Source.transaction(async (m) => {
      const chqRepo = m.getRepository(Cheque);
      const entryRepo = m.getRepository(CashbookEntry);
      const accountRepo = m.getRepository(CashBankAccount);

      const isReceived = cheque.type !== 'ISSUED';
      const entry = entryRepo.create({
        referenceNo: `CHQ-CLR-${cheque.chequeNo}-${Date.now()}`,
        date: new Date(),
        accountId: targetAccount.id,
        entryType: isReceived ? 'RECEIPT' : 'PAYMENT',
        amount: Number(cheque.amount),
        category: isReceived ? 'Cheque Deposit' : 'Cheque Payment',
        description: `Cheque cleared — ${cheque.partyName} #${cheque.chequeNo}${cheque.sourceLabel ? ` · ${cheque.sourceLabel}` : ''}`,
        paymentMode: 'Cheque',
        chequeNo: cheque.chequeNo,
        notes: notes || undefined,
        createdBy: userId,
        branchId,
        sourceType: 'CHEQUE_CLEAR',
        sourceId: cheque.id,
      });
      const saved = await entryRepo.save(entry);
      cheque.cashbookEntryId = saved.id;

      const account = await accountRepo.findOne({ where: { id: targetAccount.id } });
      if (!account) {
        throw new AppError(
          'The bank account for this cheque could not be found — it may have just been removed. Please try again after selecting a valid Bank account.',
          400,
        );
      }
      const delta = isReceived ? Number(cheque.amount) : -Number(cheque.amount);
      account.currentBalance = Number(account.currentBalance) + delta;
      await accountRepo.save(account);

      cheque.status = 'CLEARED';
      cheque.clearedDate = clearedDate ? new Date(clearedDate) : (new Date() as unknown as Date);
      await chqRepo.save(cheque);
      await logHistory(m, cheque.id, prevStatus, 'CLEARED', userId, notes);
    });

    // An ISSUED cheque against a vendor purchase (Manager/Employee purchase-payment
    // flows) never recorded a PurchasePayment when it was created — "Cheque at Clear"
    // means the purchase's Outstanding must only actually drop now, not when the
    // cheque was merely issued. Best-effort: the cash/cheque-status transaction above
    // already committed and must not roll back over this cross-service call.
    if (cheque.type === 'ISSUED' && cheque.sourceType === 'PURCHASE' && cheque.sourceReferenceId) {
      try {
        const venInvUrl = process.env.VEN_INV_SERVICE_URL || 'http://localhost:3003';
        const serviceToken = makeServiceToken();
        const venInvRes = await fetch(`${venInvUrl}/purchases/internal/record-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceToken}`,
            'x-internal-service': 'billing',
          },
          body: JSON.stringify({
            purchaseId: cheque.sourceReferenceId,
            branchId,
            amount: Number(cheque.amount),
            paymentMethod: 'Cheque',
            description: `Vendor cheque cleared — ${cheque.partyName} #${cheque.chequeNo}`,
            referenceNumber: cheque.chequeNo,
            paymentDate: cheque.clearedDate,
            createdBy: userId,
          }),
        });
        if (!venInvRes.ok) {
          const errText = await venInvRes.text();
          logger.error(
            '[cheques/clear] Failed to record PurchasePayment for cleared cheque — the cheque cleared and cash moved, but the purchase Outstanding was not reduced',
            {
              chequeId: cheque.id,
              purchaseId: cheque.sourceReferenceId,
              status: venInvRes.status,
              errText,
            },
          );
        }
      } catch (err) {
        logger.error(
          '[cheques/clear] Failed to record PurchasePayment for cleared cheque — the cheque cleared and cash moved, but the purchase Outstanding was not reduced',
          { chequeId: cheque.id, purchaseId: cheque.sourceReferenceId, err },
        );
      }
    }

    // Same "Cheque at Clear" rule for an Employee expense settled by cheque
    // (payExpenseRequest): the linked ExpenseEntry was deliberately left 'APPROVED'
    // (still showing as Outstanding on the Payable page) when the cheque was issued —
    // it only actually becomes PAID now.
    if (cheque.type === 'ISSUED' && cheque.sourceType === 'EXPENSE' && cheque.sourceReferenceId) {
      try {
        const expReq = await Source.getRepository(EmployeeExpenseRequest).findOne({
          where: { id: cheque.sourceReferenceId },
        });
        if (expReq?.expenseEntryId) {
          await Source.getRepository(ExpenseEntry).update(expReq.expenseEntryId, {
            status: 'PAID',
            paymentMode: 'Cheque',
            paymentDate: cheque.clearedDate,
            referenceNo: cheque.chequeNo,
          });
        }
      } catch (err) {
        logger.error('[cheques/clear] Failed to mark linked ExpenseEntry PAID for cleared cheque', {
          chequeId: cheque.id,
          expenseRequestId: cheque.sourceReferenceId,
          err,
        });
      }
    }

    res.json({ success: true, data: cheque });
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/bounce — Returned: deposited/issued cheque dishonored by the bank ──
// A description/reason is mandatory — no silent status change without an explanation.
router.post('/:id/bounce', async (req, res, next) => {
  try {
    const branchId = req.user!.branchId;
    const userId = req.user!.userId;
    const { notes } = req.body;

    if (!notes || !String(notes).trim()) {
      throw new AppError('A reason is required to mark a cheque as Returned', 400);
    }

    const repo = Source.getRepository(Cheque);
    const cheque = await repo.findOne({ where: { id: req.params.id, branchId } });
    if (!cheque) throw new AppError('Cheque not found', 404);
    if (!['DEPOSITED', 'ISSUED'].includes(cheque.status)) {
      throw new AppError('Only DEPOSITED or ISSUED cheques can be bounced', 400);
    }

    const prevStatus = cheque.status;

    await Source.transaction(async (m) => {
      const entryRepo = m.getRepository(CashbookEntry);
      const accountRepo = m.getRepository(CashBankAccount);
      const chqRepo = m.getRepository(Cheque);

      // Legacy guard: if cashbookEntryId exists, the old code moved balance at deposit/issue.
      // Reverse that entry so the books stay correct for legacy cheques.
      if (cheque.cashbookEntryId && cheque.accountId) {
        if (cheque.type === 'RECEIVED') {
          const reversal = entryRepo.create({
            referenceNo: `CHQ-BNC-${cheque.chequeNo}-${Date.now()}`,
            date: new Date(),
            accountId: cheque.accountId,
            entryType: 'PAYMENT',
            amount: Number(cheque.amount),
            category: 'Cheque Bounce Reversal',
            description: `Bounce reversal — ${cheque.partyName} #${cheque.chequeNo}`,
            paymentMode: 'Cheque',
            chequeNo: cheque.chequeNo,
            notes: notes || undefined,
            createdBy: userId,
            branchId,
          });
          await entryRepo.save(reversal);
          await accountRepo.decrement(
            { id: cheque.accountId },
            'currentBalance',
            Number(cheque.amount),
          );
        } else {
          const reversal = entryRepo.create({
            referenceNo: `CHQ-BNC-${cheque.chequeNo}-${Date.now()}`,
            date: new Date(),
            accountId: cheque.accountId,
            entryType: 'RECEIPT',
            amount: Number(cheque.amount),
            category: 'Cheque Bounce Reversal',
            description: `Bounce reversal — ${cheque.partyName} #${cheque.chequeNo}`,
            paymentMode: 'Cheque',
            chequeNo: cheque.chequeNo,
            notes: notes || undefined,
            createdBy: userId,
            branchId,
          });
          await entryRepo.save(reversal);
          await accountRepo.increment(
            { id: cheque.accountId },
            'currentBalance',
            Number(cheque.amount),
          );
        }
      }
      // New cheques (cashbookEntryId is null) have no cash-account movement to
      // reverse (Cash at Bank only ever moved at Clear, which a bounced cheque
      // by definition never reached) — but the invoice was still credited as Paid
      // at approval time, and that credit does need reversing regardless.
      await reverseInvoiceCreditForCheque(m, cheque, userId, `bounced: ${notes}`);

      cheque.status = 'BOUNCED';
      await chqRepo.save(cheque);
      await logHistory(m, cheque.id, prevStatus, 'BOUNCED', userId, notes || 'Cheque bounced');
    });

    const branchManagerId = await getBranchManager(branchId);
    await sendNotifications(
      [userId, branchManagerId ?? ''],
      'Cheque Bounced',
      `Cheque #${cheque.chequeNo} from ${cheque.partyName} has bounced.`,
    );
    res.json({ success: true, data: cheque });
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/cancel — Cancelled: manual cancellation before deposit/issue ───────
// A description/reason is mandatory — no silent status change without an explanation.
// Only valid pre-deposit/issue, so there is never a prior cash effect to reverse.
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const branchId = req.user!.branchId;
    const userId = req.user!.userId;
    const { notes } = req.body;

    if (!notes || !String(notes).trim()) {
      throw new AppError('A reason is required to cancel a cheque', 400);
    }

    const repo = Source.getRepository(Cheque);
    const cheque = await repo.findOne({ where: { id: req.params.id, branchId } });
    if (!cheque) throw new AppError('Cheque not found', 404);
    if (cheque.status !== 'PENDING')
      throw new AppError('Only PENDING cheques can be cancelled', 400);

    await Source.transaction(async (m) => {
      const chqRepo = m.getRepository(Cheque);

      // Only ever reachable from PENDING, i.e. before Deposit/Issue — so there's
      // never a cash-account effect to undo here. But the Cheque row itself only
      // ever exists because approveSalePayment already credited the invoice as
      // Paid when the SalePaymentRequest was approved, so that still needs
      // reversing even though cash itself was never touched.
      await reverseInvoiceCreditForCheque(m, cheque, userId, `cancelled: ${notes}`);

      cheque.status = 'CANCELLED';
      await chqRepo.save(cheque);
      await logHistory(m, cheque.id, 'PENDING', 'CANCELLED', userId, notes);
    });

    res.json({ success: true, data: cheque });
  } catch (err) {
    next(err);
  }
});

export default router;
