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

// ── GET / — list cheques ──────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const branchId = req.user!.branchId;
    const { status, type, search } = req.query;

    const repo = Source.getRepository(Cheque);
    const qb = repo
      .createQueryBuilder('c')
      .where('c.branchId = :branchId', { branchId })
      .orderBy('c.dueDate', 'ASC');

    if (status && status !== 'ALL') qb.andWhere('c.status = :status', { status });
    if (type && type !== 'ALL') qb.andWhere('c.type = :type', { type });
    if (search) {
      qb.andWhere('(c.chequeNo ILIKE :s OR c.partyName ILIKE :s OR c.bankName ILIKE :s)', {
        s: `%${search}%`,
      });
    }

    const cheques = await qb.getMany();
    res.json({ success: true, data: cheques });
  } catch (err) {
    console.error('[GET /accounts/cheques]', (err as Error).message);
    next(err);
  }
});

// ── GET /summary — counts by status ──────────────────────────────────────────
router.get('/summary', async (req, res, next) => {
  try {
    const branchId = req.user!.branchId;
    const rows = await Source.query<{ status: string; count: string }[]>(
      `SELECT status, COUNT(*) AS count FROM cheques WHERE branch_id = $1 GROUP BY status`,
      [branchId],
    );
    const summary: Record<string, number> = {};
    for (const r of rows) summary[r.status] = parseInt(r.count, 10);
    res.json({ success: true, data: summary });
  } catch (err) {
    console.error('[GET /accounts/cheques/summary]', (err as Error).message);
    next(err);
  }
});

// ── GET /notifications — due within 3 days or overdue ─────────────────────────
router.get('/notifications', async (req, res, next) => {
  try {
    const branchId = req.user!.branchId;
    const rows = await Source.query<Cheque[]>(
      `SELECT * FROM cheques
       WHERE branch_id = $1
         AND status IN ('PENDING', 'ISSUED')
         AND due_date <= CURRENT_DATE + INTERVAL '3 days'
       ORDER BY due_date ASC
       LIMIT 20`,
      [branchId],
    );
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    console.error('[GET /accounts/cheques/notifications]', (err as Error).message);
    next(err);
  }
});

// ── GET /:id — single cheque with history ─────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const branchId = req.user!.branchId;
    const cheque = await Source.getRepository(Cheque).findOne({
      where: { id: req.params.id, branchId },
    });
    if (!cheque) throw new AppError('Cheque not found', 404);

    const history = await Source.getRepository(ChequeStatusHistory).find({
      where: { chequeId: cheque.id },
      order: { changedAt: 'ASC' },
    });

    res.json({ success: true, data: { ...cheque, history } });
  } catch (err) {
    console.error('[GET /accounts/cheques/:id]', (err as Error).message);
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
      createdBy: userId,
    });
    const saved = await repo.save(cheque);

    await Source.transaction(async (m) => {
      await logHistory(m, saved.id, undefined, 'PENDING', userId, 'Cheque created');
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error('[POST /accounts/cheques]', (err as Error).message);
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
    console.error('[PATCH /accounts/cheques/:id]', (err as Error).message);
    next(err);
  }
});

// ── POST /:id/deposit — deposit RECEIVED cheque ───────────────────────────────
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

    let savedEntry: CashbookEntry | null = null;

    await Source.transaction(async (m) => {
      const entryRepo = m.getRepository(CashbookEntry);
      const accountRepo = m.getRepository(CashBankAccount);
      const chqRepo = m.getRepository(Cheque);

      const entry = entryRepo.create({
        referenceNo: `CHQ-DEP-${cheque.chequeNo}-${Date.now()}`,
        date: depositDate || new Date(),
        accountId,
        entryType: 'RECEIPT',
        amount: Number(cheque.amount),
        category: 'Cheque Receipt',
        description: `Cheque deposit — ${cheque.partyName} #${cheque.chequeNo}`,
        paymentMode: 'Cheque',
        chequeNo: cheque.chequeNo,
        notes: notes || undefined,
        createdBy: userId,
        branchId,
      });
      savedEntry = await entryRepo.save(entry);

      await accountRepo.increment({ id: accountId }, 'currentBalance', Number(cheque.amount));

      cheque.status = 'DEPOSITED';
      cheque.accountId = accountId;
      cheque.cashbookEntryId = savedEntry!.id;
      await chqRepo.save(cheque);

      await logHistory(m, cheque.id, 'PENDING', 'DEPOSITED', userId, notes);
    });

    await sendNotification(
      userId,
      'Cheque Deposited',
      `Cheque #${cheque.chequeNo} from ${cheque.partyName} deposited.`,
    );
    res.json({ success: true, data: cheque });
  } catch (err) {
    console.error('[POST /accounts/cheques/:id/deposit]', (err as Error).message);
    next(err);
  }
});

// ── POST /:id/issue — issue ISSUED-type cheque as payment ────────────────────
router.post('/:id/issue', async (req, res, next) => {
  try {
    const branchId = req.user!.branchId;
    const userId = req.user!.userId;
    const { accountId, issueDate, notes } = req.body;

    if (!accountId) throw new AppError('Bank account is required to issue cheque', 400);

    const chequeRepo = Source.getRepository(Cheque);
    const cheque = await chequeRepo.findOne({ where: { id: req.params.id, branchId } });
    if (!cheque) throw new AppError('Cheque not found', 404);
    if (cheque.type !== 'ISSUED')
      throw new AppError('Only ISSUED-type cheques can be issued as payment', 400);
    if (cheque.status !== 'PENDING') throw new AppError('Only PENDING cheques can be issued', 400);

    await Source.transaction(async (m) => {
      const entryRepo = m.getRepository(CashbookEntry);
      const accountRepo = m.getRepository(CashBankAccount);
      const chqRepo = m.getRepository(Cheque);

      const entry = entryRepo.create({
        referenceNo: `CHQ-ISS-${cheque.chequeNo}-${Date.now()}`,
        date: issueDate || new Date(),
        accountId,
        entryType: 'PAYMENT',
        amount: Number(cheque.amount),
        category: 'Cheque Payment',
        description: `Cheque issued to ${cheque.partyName} #${cheque.chequeNo}`,
        paymentMode: 'Cheque',
        chequeNo: cheque.chequeNo,
        notes: notes || undefined,
        createdBy: userId,
        branchId,
      });
      const savedEntry = await entryRepo.save(entry);

      await accountRepo.decrement({ id: accountId }, 'currentBalance', Number(cheque.amount));

      cheque.status = 'ISSUED';
      cheque.accountId = accountId;
      cheque.cashbookEntryId = savedEntry.id;
      cheque.issueDate = issueDate || (new Date() as unknown as Date);
      await chqRepo.save(cheque);

      await logHistory(m, cheque.id, 'PENDING', 'ISSUED', userId, notes);
    });

    res.json({ success: true, data: cheque });
  } catch (err) {
    console.error('[POST /accounts/cheques/:id/issue]', (err as Error).message);
    next(err);
  }
});

// ── POST /:id/clear — mark DEPOSITED cheque as CLEARED ───────────────────────
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
      cheque.status = 'CLEARED';
      await chqRepo.save(cheque);
      await logHistory(m, cheque.id, prevStatus, 'CLEARED', userId, notes);
    });

    res.json({ success: true, data: cheque });
  } catch (err) {
    console.error('[POST /accounts/cheques/:id/clear]', (err as Error).message);
    next(err);
  }
});

// ── POST /:id/bounce — bounce cheque and reverse cashbook entry ───────────────
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

      if (cheque.cashbookEntryId && cheque.accountId) {
        if (cheque.type === 'RECEIVED') {
          // reverse: debit from account (PAYMENT counter-entry)
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
          // ISSUED bounce: reverse the payment, credit back to account
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
    console.error('[POST /accounts/cheques/:id/bounce]', (err as Error).message);
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
    console.error('[POST /accounts/cheques/:id/cancel]', (err as Error).message);
    next(err);
  }
});

export default router;
