import { Request, Response, NextFunction } from 'express';
import { Source } from '../config/dataSource';
import { IncomeEntry } from '../entities/incomeEntryEntity';
import { Cheque } from '../entities/chequeEntity';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
import { postCashbookEntry, requireCashAccount } from '../services/cashbookService';
import { applyBranchQB } from '../middlewares/branchFilterMiddleware';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';

const SYSTEM_UUID = '00000000-0000-0000-0000-000000000000';

export const getIncomeEntries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(IncomeEntry);
    const { category, status, fromDate, toDate } = req.query;
    const qb = repo.createQueryBuilder('i');
    applyBranchQB(qb as never, 'i', req.branchFilter ?? []);
    if (category) qb.andWhere('i.category = :category', { category });
    if (status) qb.andWhere('i.status = :status', { status });
    if (fromDate) qb.andWhere('i.date >= :fromDate', { fromDate });
    if (toDate) qb.andWhere('i.date <= :toDate', { toDate });
    qb.orderBy('i.date', 'DESC');
    const entries = await qb.getMany();
    res.json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
};

async function postIncomeReceipt(entry: IncomeEntry, userId?: string): Promise<void> {
  await postCashbookEntry({
    date: entry.receivedDate ?? entry.date,
    entryType: 'RECEIPT',
    amount: Number(entry.netAmount),
    category: entry.category,
    branchId: entry.branchId,
    createdBy: userId ?? entry.createdBy ?? SYSTEM_UUID,
    paymentMode: entry.receivedMode,
    accountId: entry.receivedTo,
    autoResolveAccount: true,
    description: entry.description,
    chequeNo: entry.referenceNo,
    notes: entry.notes,
    sourceType: 'INCOME',
    sourceId: entry.id,
  });
}

export const createIncomeEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(IncomeEntry);
    if (!req.body.incomeNo) {
      const count = await repo.count();
      req.body.incomeNo = `INC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    }
    const entry = repo.create({
      ...req.body,
      branchId: req.user?.branchId ?? req.branchFilter?.[0] ?? req.body.branchId,
      createdBy: req.user?.userId ?? req.body.createdBy,
    }) as unknown as IncomeEntry;

    // Validate before saving anything — see receiveIncomeEntry for why.
    if (
      entry.status === 'RECEIVED' &&
      (entry.receivedMode ?? '').trim().toLowerCase() !== 'cheque'
    ) {
      await requireCashAccount(Source, {
        branchId: entry.branchId,
        paymentMode: entry.receivedMode,
        explicitAccountId: entry.receivedTo,
      });
    }

    const saved = await repo.save(entry);
    if (saved.status === 'RECEIVED') {
      await postIncomeReceipt(saved, req.user?.userId);
    }
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const updateIncomeEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(IncomeEntry);
    const id = req.params.id as string;
    const entry = await repo.findOne({ where: { id } });
    if (!entry) throw new AppError('Income entry not found', 404);
    const branchFilter: string[] = req.branchFilter ?? [];
    if (branchFilter.length > 0 && !branchFilter.includes(entry.branchId)) {
      throw new AppError('You do not have permission to modify this income entry', 403);
    }
    const wasReceived = entry.status === 'RECEIVED';
    Object.assign(entry, req.body);

    if (
      entry.status === 'RECEIVED' &&
      !wasReceived &&
      (entry.receivedMode ?? '').trim().toLowerCase() !== 'cheque'
    ) {
      await requireCashAccount(Source, {
        branchId: entry.branchId,
        paymentMode: entry.receivedMode,
        explicitAccountId: entry.receivedTo,
      });
    }

    const saved = await repo.save(entry);
    if (saved.status === 'RECEIVED' && !wasReceived) {
      await postIncomeReceipt(saved, req.user?.userId);
    }
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const approveIncomeEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(IncomeEntry);
    const id = req.params.id as string;
    const entry = await repo.findOne({ where: { id } });
    if (!entry) throw new AppError('Income entry not found', 404);
    if (entry.status === 'RECEIVED')
      throw new AppError('Cannot approve an already-received entry', 400);
    if (entry.status === 'APPROVED') throw new AppError('Income entry is already approved', 400);
    entry.status = 'APPROVED';
    entry.approvedBy = req.user?.userId;
    const saved = await repo.save(entry);
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

// Mark an income entry RECEIVED (records receipt details) and post it to the cashbook.
export const receiveIncomeEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(IncomeEntry);
    const id = req.params.id as string;
    const entry = await repo.findOne({ where: { id } });
    if (!entry) throw new AppError('Income entry not found', 404);
    if (entry.status === 'RECEIVED') throw new AppError('Income entry is already received', 400);
    if (entry.status !== 'APPROVED')
      throw new AppError('Income entry must be APPROVED before it can be received', 400);

    const { receivedTo, receivedMode, receivedDate, referenceNo, chequeNumber, chequeBankName } =
      req.body as {
        receivedTo?: string;
        receivedMode?: string;
        receivedDate?: string;
        referenceNo?: string;
        chequeNumber?: string;
        chequeBankName?: string;
      };

    const isCheque = (receivedMode ?? '').trim().toLowerCase() === 'cheque';

    // Block before writing anything: entry.status used to flip to RECEIVED and save
    // regardless of whether a real account existed for the non-cheque receipt below.
    if (!isCheque) {
      await requireCashAccount(Source, {
        branchId: entry.branchId,
        paymentMode: receivedMode,
        explicitAccountId: receivedTo ?? entry.receivedTo,
      });
    }

    entry.status = 'RECEIVED';
    entry.receivedTo = receivedTo ?? entry.receivedTo;
    entry.receivedMode = receivedMode ?? entry.receivedMode;
    entry.receivedDate = receivedDate ? new Date(receivedDate) : (entry.receivedDate ?? new Date());
    entry.referenceNo = isCheque
      ? (chequeNumber ?? referenceNo ?? entry.referenceNo)
      : (referenceNo ?? entry.referenceNo);
    const saved = await repo.save(entry);

    if (isCheque) {
      // Cheque received but not yet cleared — record it PENDING; the existing
      // deposit/clear cheque flow moves the cash/bank balance once cleared.
      if (chequeNumber) {
        try {
          const chequeRepo = Source.getRepository(Cheque);
          const existingCheque = await chequeRepo.findOne({
            where: { chequeNo: chequeNumber, branchId: entry.branchId },
          });
          if (!existingCheque) {
            const c = chequeRepo.create({
              chequeNo: chequeNumber,
              bankName: chequeBankName || undefined,
              partyName: entry.description?.slice(0, 100) || entry.category,
              amount: Number(entry.netAmount),
              dueDate: saved.receivedDate ?? new Date(),
              issueDate: saved.receivedDate ?? new Date(),
              type: 'RECEIVED',
              status: 'PENDING',
              description: `Income: ${entry.incomeNo} — ${entry.description?.slice(0, 200) || entry.category}`,
              branchId: entry.branchId,
              sourceType: 'INCOME',
              sourceReferenceId: entry.id,
              sourceLabel: `Income ${entry.incomeNo}`,
              createdBy: req.user?.userId ?? SYSTEM_UUID,
            });
            await chequeRepo.save(c);
          }
        } catch (err) {
          logger.error('[receiveIncomeEntry] Failed to create RECEIVED cheque record', err);
        }
      }
    } else {
      await postIncomeReceipt(saved, req.user?.userId);
    }
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

// Full detail for the "View" drill-down — same entry fields already on the list
// page, plus the resolved receivedTo account name and (if received via Cheque)
// the real linked Cheque row (sourceType='INCOME', sourceReferenceId=entry.id),
// matching the cheque-reuse pattern already established for Receivable/Payable rows.
export const getIncomeEntryDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(IncomeEntry);
    const id = req.params.id as string;
    const entry = await repo.findOne({ where: { id } });
    if (!entry) throw new AppError('Income entry not found', 404);

    let receivedToAccount: { id: string; name: string; type: string } | null = null;
    if (entry.receivedTo) {
      const acct = await Source.getRepository(CashBankAccount).findOne({
        where: { id: entry.receivedTo },
      });
      if (acct) receivedToAccount = { id: acct.id, name: acct.name, type: acct.type };
    }

    let cheque: Cheque | null = null;
    if ((entry.receivedMode ?? '').trim().toLowerCase() === 'cheque') {
      cheque = await Source.getRepository(Cheque).findOne({
        where: { sourceType: 'INCOME', sourceReferenceId: entry.id },
      });
    }

    res.json({ success: true, data: { ...entry, receivedToAccount, cheque } });
  } catch (err) {
    next(err);
  }
};

export const deleteIncomeEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(IncomeEntry);
    const id = req.params.id as string;
    const entry = await repo.findOne({ where: { id } });
    if (!entry) throw new AppError('Income entry not found', 404);
    const branchFilter: string[] = req.branchFilter ?? [];
    if (branchFilter.length > 0 && !branchFilter.includes(entry.branchId)) {
      throw new AppError('You do not have permission to delete this income entry', 403);
    }
    if (entry.status === 'RECEIVED')
      throw new AppError('Cannot delete a received income entry — reverse it first', 400);
    await repo.delete(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
