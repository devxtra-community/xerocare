import { Request, Response, NextFunction } from 'express';
import { Source } from '../config/dataSource';
import { ChartOfAccount } from '../entities/chartOfAccountEntity';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
import { ManualJournalEntry } from '../entities/manualJournalEntryEntity';
import { ExpenseEntry } from '../entities/expenseEntryEntity';
import { IncomeEntry } from '../entities/incomeEntryEntity';
import { AppError } from '../errors/appError';

const CATEGORY_RANGES: Record<string, [number, number]> = {
  ASSET: [1000, 1999],
  LIABILITY: [2000, 2999],
  EQUITY: [3000, 3999],
  INCOME: [4000, 4999],
  EXPENSE: [5000, 5999],
};

const VALID_GROUPS: Record<string, string[]> = {
  ASSET: ['CURRENT_ASSET', 'NON_CURRENT_ASSET'],
  LIABILITY: ['CURRENT_LIABILITY', 'NON_CURRENT_LIABILITY'],
  EQUITY: ['EQUITY'],
  INCOME: ['INCOME'],
  EXPENSE: ['EXPENSE'],
};

const VALID_SOURCE_TYPES = [
  'CASH_BANK_LINKED',
  'EXPENSE_CATEGORY_LINKED',
  'INCOME_CATEGORY_LINKED',
  'MANUAL_JOURNAL',
];

// Full raw list — the management UI (Add Account / Add Sub-Account / parent pickers).
// Unlike getChartOfAccounts (live balances for display), this is structure only.
export const listChartOfAccountsStructure = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const repo = Source.getRepository(ChartOfAccount);
    const accounts = await repo.find({ order: { accountNumber: 'ASC' } });
    res.json({ success: true, data: accounts });
  } catch (err) {
    next(err);
  }
};

// Suggests the next available account number for a new Main Account (category range)
// or Sub-Account (parent's decimal-suffix children).
export const getNextAccountNumber = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ChartOfAccount);
    const { category, parentAccountId } = req.query as {
      category?: string;
      parentAccountId?: string;
    };

    if (parentAccountId) {
      const parent = await repo.findOne({ where: { id: parentAccountId } });
      if (!parent) throw new AppError('Parent account not found', 404);
      const children = await repo.find({ where: { parentAccountId } });
      let maxSuffix = 0;
      for (const c of children) {
        const suffix = parseInt(c.accountNumber.split('-')[1] ?? '0', 10);
        if (!Number.isNaN(suffix) && suffix > maxSuffix) maxSuffix = suffix;
      }
      const next = `${parent.accountNumber}-${String(maxSuffix + 1).padStart(2, '0')}`;
      return res.json({ success: true, data: { accountNumber: next } });
    }

    if (!category || !CATEGORY_RANGES[category]) {
      throw new AppError('A valid category is required', 400);
    }
    const [min, max] = CATEGORY_RANGES[category];
    const accounts = await repo.find();
    let maxNum = min - 1;
    for (const a of accounts) {
      if (a.parentAccountId) continue; // only main accounts occupy the range directly
      const n = parseInt(a.accountNumber, 10);
      if (!Number.isNaN(n) && n >= min && n <= max && n > maxNum) maxNum = n;
    }
    const next = String(Math.min(maxNum + 1, max));
    res.json({ success: true, data: { accountNumber: next } });
  } catch (err) {
    next(err);
  }
};

async function validateSourceTypeFields(
  category: string,
  sourceType: string,
  linkedCashBankAccountId?: string,
  categoryKey?: string,
) {
  if (!VALID_SOURCE_TYPES.includes(sourceType)) {
    throw new AppError(`Invalid source type: ${sourceType}`, 400);
  }
  if (sourceType === 'CASH_BANK_LINKED') {
    if (category !== 'ASSET') {
      throw new AppError('CASH_BANK_LINKED accounts must be under Assets', 400);
    }
    if (!linkedCashBankAccountId) {
      throw new AppError('linkedCashBankAccountId is required for CASH_BANK_LINKED accounts', 400);
    }
    const acc = await Source.getRepository(CashBankAccount).findOne({
      where: { id: linkedCashBankAccountId },
    });
    if (!acc) throw new AppError('Linked cash/bank account not found', 404);
    const existing = await Source.getRepository(ChartOfAccount).findOne({
      where: { linkedCashBankAccountId },
    });
    if (existing) {
      throw new AppError(
        'That cash/bank account is already linked to another chart of accounts entry',
        400,
      );
    }
  } else if (sourceType === 'EXPENSE_CATEGORY_LINKED') {
    if (category !== 'EXPENSE') {
      throw new AppError('EXPENSE_CATEGORY_LINKED accounts must be under Expenses', 400);
    }
    if (!categoryKey?.trim()) {
      throw new AppError('categoryKey is required for EXPENSE_CATEGORY_LINKED accounts', 400);
    }
    const existing = await Source.getRepository(ChartOfAccount).findOne({
      where: {
        categoryKey: categoryKey.trim().toUpperCase(),
        sourceType: 'EXPENSE_CATEGORY_LINKED',
      },
    });
    if (existing)
      throw new AppError('That expense category is already linked to another account', 400);
  } else if (sourceType === 'INCOME_CATEGORY_LINKED') {
    if (category !== 'INCOME') {
      throw new AppError('INCOME_CATEGORY_LINKED accounts must be under Income', 400);
    }
    if (!categoryKey?.trim()) {
      throw new AppError('categoryKey is required for INCOME_CATEGORY_LINKED accounts', 400);
    }
    const existing = await Source.getRepository(ChartOfAccount).findOne({
      where: {
        categoryKey: categoryKey.trim().toUpperCase(),
        sourceType: 'INCOME_CATEGORY_LINKED',
      },
    });
    if (existing)
      throw new AppError('That income category is already linked to another account', 400);
  }
}

export const createChartOfAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ChartOfAccount);
    const {
      accountName,
      category,
      accountGroup,
      accountNumber,
      parentAccountId,
      sourceType,
      linkedCashBankAccountId,
      categoryKey,
    } = req.body as {
      accountName?: string;
      category?: string;
      accountGroup?: string;
      accountNumber?: string;
      parentAccountId?: string;
      sourceType?: string;
      linkedCashBankAccountId?: string;
      categoryKey?: string;
    };

    if (!accountName?.trim()) throw new AppError('accountName is required', 400);
    if (!sourceType) throw new AppError('sourceType is required', 400);

    let resolvedCategory = category;
    let resolvedGroup = accountGroup;
    let resolvedNumber = accountNumber?.trim();
    let parent: ChartOfAccount | null = null;

    if (parentAccountId) {
      parent = await repo.findOne({ where: { id: parentAccountId } });
      if (!parent) throw new AppError('Parent account not found', 404);
      // Sub-accounts always inherit the parent's category/group — a sub-account
      // of a Current Asset can't itself be a Liability.
      resolvedCategory = parent.category;
      resolvedGroup = parent.accountGroup;
      if (!resolvedNumber) {
        const children = await repo.find({ where: { parentAccountId } });
        let maxSuffix = 0;
        for (const c of children) {
          const suffix = parseInt(c.accountNumber.split('-')[1] ?? '0', 10);
          if (!Number.isNaN(suffix) && suffix > maxSuffix) maxSuffix = suffix;
        }
        resolvedNumber = `${parent.accountNumber}-${String(maxSuffix + 1).padStart(2, '0')}`;
      } else if (!resolvedNumber.startsWith(`${parent.accountNumber}-`)) {
        throw new AppError(
          `Sub-account numbers must start with the parent's number, e.g. ${parent.accountNumber}-01`,
          400,
        );
      }
    } else {
      if (!resolvedCategory || !CATEGORY_RANGES[resolvedCategory]) {
        throw new AppError('A valid category is required for a Main Account', 400);
      }
      if (!resolvedGroup || !VALID_GROUPS[resolvedCategory].includes(resolvedGroup)) {
        throw new AppError(
          `accountGroup must be one of: ${VALID_GROUPS[resolvedCategory].join(', ')}`,
          400,
        );
      }
      const [min, max] = CATEGORY_RANGES[resolvedCategory];
      if (!resolvedNumber) {
        const accounts = await repo.find();
        let maxNum = min - 1;
        for (const a of accounts) {
          if (a.parentAccountId) continue;
          const n = parseInt(a.accountNumber, 10);
          if (!Number.isNaN(n) && n >= min && n <= max && n > maxNum) maxNum = n;
        }
        resolvedNumber = String(Math.min(maxNum + 1, max));
      } else {
        const n = parseInt(resolvedNumber, 10);
        if (Number.isNaN(n) || n < min || n > max) {
          throw new AppError(
            `Account number for ${resolvedCategory} must be between ${min} and ${max}`,
            400,
          );
        }
      }
    }

    if (!resolvedCategory || !resolvedGroup || !resolvedNumber) {
      throw new AppError('Unable to resolve account number/category/group', 400);
    }

    await validateSourceTypeFields(
      resolvedCategory,
      sourceType,
      linkedCashBankAccountId,
      categoryKey,
    );

    const existingNumber = await repo.findOne({ where: { accountNumber: resolvedNumber } });
    if (existingNumber)
      throw new AppError(`Account number ${resolvedNumber} is already in use`, 400);

    const entry = repo.create({
      accountNumber: resolvedNumber,
      accountName: accountName.trim(),
      category: resolvedCategory,
      accountGroup: resolvedGroup,
      parentAccountId: parentAccountId || undefined,
      sourceType,
      isSystemDefault: false,
      linkedCashBankAccountId:
        sourceType === 'CASH_BANK_LINKED' ? linkedCashBankAccountId : undefined,
      categoryKey:
        sourceType === 'EXPENSE_CATEGORY_LINKED' || sourceType === 'INCOME_CATEGORY_LINKED'
          ? categoryKey!.trim().toUpperCase().replace(/\s+/g, '_')
          : undefined,
      isActive: true,
      createdBy: req.user?.userId,
    });
    const saved = await repo.save(entry);
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

// Update a custom account's name and optionally its number.
// Category/group/parent/sourceType remain locked (they drive report calculations).
// System-default accounts (isSystemDefault=true) are never editable.
export const renameChartOfAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ChartOfAccount);
    const id = req.params.id as string;
    const { accountName, accountNumber } = req.body as {
      accountName?: string;
      accountNumber?: string;
    };
    if (!accountName?.trim()) throw new AppError('accountName is required', 400);

    const acc = await repo.findOne({ where: { id } });
    if (!acc) throw new AppError('Account not found', 404);
    if (acc.isSystemDefault) throw new AppError('System default accounts cannot be edited', 403);

    if (accountNumber?.trim() && accountNumber.trim() !== acc.accountNumber) {
      const newNum = accountNumber.trim();
      const existing = await repo.findOne({ where: { accountNumber: newNum } });
      if (existing) throw new AppError(`Account number ${newNum} is already in use`, 400);

      if (!acc.parentAccountId) {
        const range = CATEGORY_RANGES[acc.category];
        if (range) {
          const n = parseInt(newNum, 10);
          if (Number.isNaN(n) || n < range[0] || n > range[1]) {
            throw new AppError(
              `Account number for ${acc.category} must be between ${range[0]} and ${range[1]}`,
              400,
            );
          }
        }
      } else {
        const parent = await repo.findOne({ where: { id: acc.parentAccountId } });
        if (parent && !newNum.startsWith(`${parent.accountNumber}-`)) {
          throw new AppError(
            `Sub-account numbers must start with the parent's number, e.g. ${parent.accountNumber}-01`,
            400,
          );
        }
      }
      acc.accountNumber = newNum;
    }

    acc.accountName = accountName.trim();
    const saved = await repo.save(acc);
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const setChartOfAccountActive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ChartOfAccount);
    const id = req.params.id as string;
    const { isActive } = req.body as { isActive?: boolean };
    const acc = await repo.findOne({ where: { id } });
    if (!acc) throw new AppError('Account not found', 404);
    if (acc.isSystemDefault)
      throw new AppError('System default accounts cannot be deactivated', 400);
    acc.isActive = !!isActive;
    const saved = await repo.save(acc);
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const deleteChartOfAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ChartOfAccount);
    const id = req.params.id as string;
    const acc = await repo.findOne({ where: { id } });
    if (!acc) throw new AppError('Account not found', 404);
    if (acc.isSystemDefault) throw new AppError('System default accounts cannot be deleted', 400);

    const childCount = await repo.count({ where: { parentAccountId: id } });
    if (childCount > 0) {
      throw new AppError("Delete or reassign this account's sub-accounts first", 400);
    }

    const journalCount = await Source.getRepository(ManualJournalEntry).count({
      where: { chartOfAccountId: id },
    });
    if (journalCount > 0) {
      throw new AppError(
        'This account has journal history and cannot be deleted — deactivate it instead',
        400,
      );
    }
    if (acc.sourceType === 'EXPENSE_CATEGORY_LINKED' && acc.categoryKey) {
      const count = await Source.getRepository(ExpenseEntry).count({
        where: { category: acc.categoryKey },
      });
      if (count > 0) {
        throw new AppError(
          'This category has real expense entries and cannot be deleted — deactivate it instead',
          400,
        );
      }
    }
    if (acc.sourceType === 'INCOME_CATEGORY_LINKED' && acc.categoryKey) {
      const count = await Source.getRepository(IncomeEntry).count({
        where: { category: acc.categoryKey },
      });
      if (count > 0) {
        throw new AppError(
          'This category has real income entries and cannot be deleted — deactivate it instead',
          400,
        );
      }
    }

    await repo.delete(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
