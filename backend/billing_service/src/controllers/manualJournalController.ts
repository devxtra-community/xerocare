import { Request, Response, NextFunction } from 'express';
import { Source } from '../config/dataSource';
import { ManualJournalEntry } from '../entities/manualJournalEntryEntity';
import { ChartOfAccount } from '../entities/chartOfAccountEntity';
import { applyBranchQB } from '../middlewares/branchFilterMiddleware';
import { AppError } from '../errors/appError';

export const getManualJournalEntries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ManualJournalEntry);
    const { chartOfAccountId, fromDate, toDate } = req.query;
    const qb = repo.createQueryBuilder('m');
    applyBranchQB(qb as never, 'm', req.branchFilter ?? []);
    if (chartOfAccountId)
      qb.andWhere('m.chartOfAccountId = :chartOfAccountId', { chartOfAccountId });
    if (fromDate) qb.andWhere('m.date >= :fromDate', { fromDate });
    if (toDate) qb.andWhere('m.date <= :toDate', { toDate });
    qb.orderBy('m.date', 'DESC');
    const entries = await qb.getMany();
    res.json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
};

export const createManualJournalEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ManualJournalEntry);
    const { chartOfAccountId, date, amount, description, referenceNo, notes } = req.body as {
      chartOfAccountId?: string;
      date?: string;
      amount?: number;
      description?: string;
      referenceNo?: string;
      notes?: string;
    };

    if (!chartOfAccountId) throw new AppError('chartOfAccountId is required', 400);
    if (!date) throw new AppError('date is required', 400);
    if (amount === undefined || amount === null || Number(amount) === 0) {
      throw new AppError('A non-zero amount is required', 400);
    }
    if (!description?.trim()) throw new AppError('description is required', 400);

    const account = await Source.getRepository(ChartOfAccount).findOne({
      where: { id: chartOfAccountId },
    });
    if (!account) throw new AppError('Chart of accounts entry not found', 404);
    if (account.sourceType !== 'MANUAL_JOURNAL') {
      throw new AppError('This account is not a Manual/Journal account', 400);
    }
    if (!account.isActive) throw new AppError('This account is deactivated', 400);

    const branchId = req.user?.branchId ?? req.branchFilter?.[0];
    if (!branchId) throw new AppError('Branch ID required', 400);

    const count = await repo.count();
    const entry = repo.create({
      entryNo: `MJ-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
      date: new Date(date),
      chartOfAccountId,
      amount: Number(amount),
      description: description.trim(),
      branchId,
      referenceNo,
      notes,
      createdBy: req.user!.userId,
    });
    const saved = await repo.save(entry);
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

// Reversal, not physical delete — posts an equal-and-opposite entry so the
// account's history stays auditable (same principle as cashbook reversal).
export const reverseManualJournalEntry = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const repo = Source.getRepository(ManualJournalEntry);
    const id = req.params.id as string;
    const original = await repo.findOne({ where: { id } });
    if (!original) throw new AppError('Journal entry not found', 404);
    if (original.entryNo.startsWith('REV-')) {
      throw new AppError('Cannot reverse a reversal entry', 400);
    }
    const existingReversal = await repo.findOne({ where: { referenceNo: `REV-${original.id}` } });
    if (existingReversal) throw new AppError('This entry has already been reversed', 400);

    const count = await repo.count();
    const reversal = repo.create({
      entryNo: `MJ-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
      date: new Date(),
      chartOfAccountId: original.chartOfAccountId,
      amount: -Number(original.amount),
      description: `Reversal of ${original.entryNo}: ${original.description}`,
      branchId: original.branchId,
      referenceNo: `REV-${original.id}`,
      createdBy: req.user!.userId,
    });
    const saved = await repo.save(reversal);
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};
