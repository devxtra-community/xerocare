import { Router } from 'express';
import axios from 'axios';
import { Source } from '../config/dataSource';
import { AppError } from '../errors/appError';
import { Cheque } from '../entities/chequeEntity';
import { ChequeStatusHistory } from '../entities/chequeStatusHistoryEntity';
import { CashbookEntry } from '../entities/cashbookEntryEntity';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
import { logger } from '../config/logger';

const router = Router();

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
    res.json({ success: true, data: cheques });
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
      `SELECT * FROM cheques
       WHERE branch_id IN (${placeholders})
         AND status IN ('PENDING', 'ISSUED')
         AND due_date <= CURRENT_DATE + INTERVAL '3 days'
       ORDER BY due_date ASC
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
    const branchIds = resolveBranchFilter(req);
    const repo = Source.getRepository(Cheque);
    const qb = repo
      .createQueryBuilder('c')
      .where('c.id = :id', { id: req.params.id })
      .andWhere('c.branchId IN (:...branchIds)', { branchIds });
    const cheque = await qb.getOne();
    if (!cheque) throw new AppError('Cheque not found', 404);

    const history = await Source.getRepository(ChequeStatusHistory).find({
      where: { chequeId: cheque.id },
      order: { changedAt: 'ASC' },
    });

    res.json({ success: true, data: { ...cheque, history } });
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

    const { chequeNo, bankName, partyName, amount, dueDate, issueDate, description, accountId } =
      req.body;

    if (chequeNo !== undefined) cheque.chequeNo = chequeNo;
    if (bankName !== undefined) cheque.bankName = bankName;
    if (partyName !== undefined) cheque.partyName = partyName;
    if (amount !== undefined) cheque.amount = Number(amount);
    if (dueDate !== undefined) cheque.dueDate = dueDate;
    if (issueDate !== undefined) cheque.issueDate = issueDate;
    if (description !== undefined) cheque.description = description;
    if (accountId !== undefined) cheque.accountId = accountId;

    const updated = await repo.save(cheque);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/deposit — record cheque deposited to bank (no balance yet) ──────
// Cash at Bank increases only when cheque is later CLEARED.
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

    await Source.transaction(async (m) => {
      const chqRepo = m.getRepository(Cheque);
      // Record which account will receive funds when cleared — no balance movement yet
      cheque.status = 'DEPOSITED';
      cheque.accountId = accountId;
      cheque.issueDate = depositDate ? new Date(depositDate) : (new Date() as unknown as Date);
      await chqRepo.save(cheque);
      await logHistory(m, cheque.id, 'PENDING', 'DEPOSITED', userId, notes);
    });

    await sendNotification(
      userId,
      'Cheque Deposited',
      `Cheque #${cheque.chequeNo} from ${cheque.partyName} deposited to bank — awaiting clearance.`,
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

// ── POST /:id/clear — bank confirms funds cleared; THIS is when balance moves ──
router.post('/:id/clear', async (req, res, next) => {
  try {
    const branchId = req.user!.branchId;
    const userId = req.user!.userId;
    const { notes } = req.body;

    const repo = Source.getRepository(Cheque);
    const cheque = await repo.findOne({ where: { id: req.params.id, branchId } });
    if (!cheque) throw new AppError('Cheque not found', 404);
    if (!['DEPOSITED', 'ISSUED'].includes(cheque.status)) {
      throw new AppError('Only DEPOSITED or ISSUED cheques can be cleared', 400);
    }

    const prevStatus = cheque.status;

    await Source.transaction(async (m) => {
      const chqRepo = m.getRepository(Cheque);
      const entryRepo = m.getRepository(CashbookEntry);
      const accountRepo = m.getRepository(CashBankAccount);

      // Move cash: RECEIVED cheque cleared → Cash at Bank +amount
      //            ISSUED cheque cleared   → Cash at Bank -amount
      // Guard: if cashbookEntryId is already set (legacy cheque deposited with old behaviour),
      // the balance was already moved at deposit time — skip creating a new entry.
      if (!cheque.cashbookEntryId && cheque.accountId) {
        const isReceipt = cheque.type === 'RECEIVED';
        const entry = entryRepo.create({
          referenceNo: `CHQ-CLR-${cheque.chequeNo}-${Date.now()}`,
          date: new Date(),
          accountId: cheque.accountId,
          entryType: isReceipt ? 'RECEIPT' : 'PAYMENT',
          amount: Number(cheque.amount),
          category: isReceipt ? 'Cheque Receipt' : 'Cheque Payment',
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

        if (isReceipt) {
          await accountRepo.increment(
            { id: cheque.accountId },
            'currentBalance',
            Number(cheque.amount),
          );
        } else {
          await accountRepo.decrement(
            { id: cheque.accountId },
            'currentBalance',
            Number(cheque.amount),
          );
        }
      }

      cheque.status = 'CLEARED';
      await chqRepo.save(cheque);
      await logHistory(m, cheque.id, prevStatus, 'CLEARED', userId, notes);
    });

    res.json({ success: true, data: cheque });
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/bounce — cheque bounced (no cash reversal needed: money never moved) ──
router.post('/:id/bounce', async (req, res, next) => {
  try {
    const branchId = req.user!.branchId;
    const userId = req.user!.userId;
    const { notes } = req.body;

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
      // New cheques (cashbookEntryId is null) have no balance movement to reverse.

      cheque.status = 'BOUNCED';
      await chqRepo.save(cheque);
      await logHistory(m, cheque.id, prevStatus, 'BOUNCED', userId, notes || 'Cheque bounced');
    });

    await sendNotification(
      userId,
      'Cheque Bounced',
      `Cheque #${cheque.chequeNo} from ${cheque.partyName} has bounced.`,
    );
    res.json({ success: true, data: cheque });
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/cancel — cancel PENDING cheque ─────────────────────────────────
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const branchId = req.user!.branchId;
    const userId = req.user!.userId;
    const { notes } = req.body;

    const repo = Source.getRepository(Cheque);
    const cheque = await repo.findOne({ where: { id: req.params.id, branchId } });
    if (!cheque) throw new AppError('Cheque not found', 404);
    if (cheque.status !== 'PENDING')
      throw new AppError('Only PENDING cheques can be cancelled', 400);

    await Source.transaction(async (m) => {
      const chqRepo = m.getRepository(Cheque);
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
