import { DataSource, EntityManager } from 'typeorm';
import { Source } from '../config/dataSource';
import { CashbookEntry } from '../entities/cashbookEntryEntity';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';

export type CashbookEntryType = 'RECEIPT' | 'PAYMENT';

export interface PostCashbookEntryInput {
  date: Date | string;
  entryType: CashbookEntryType;
  amount: number;
  category: string;
  branchId: string;
  createdBy: string;
  paymentMode?: string;
  /** Explicit cash/bank account. When omitted, resolved from paymentMode. */
  accountId?: string;
  linkedInvoiceId?: string;
  linkedPoId?: string;
  linkedExpenseId?: string;
  description?: string;
  chequeNo?: string;
  notes?: string;
  /** Idempotency key — INVOICE_PAYMENT | EXPENSE. Re-posting the same (sourceType, sourceId) is a no-op. */
  sourceType?: string;
  sourceId?: string;
  referenceNo?: string;
  /** No longer changes behavior — account resolution (explicit id, else by paymentMode)
   * always runs and always requires a real account. Kept optional so existing callers
   * that still pass it don't need updating. */
  autoResolveAccount?: boolean;
}

const REF_PREFIX: Record<string, string> = {
  INVOICE_PAYMENT: 'RCPT',
  EXPENSE: 'EXP',
  RECEIVABLE_PAYMENT: 'RCVP',
  PAYABLE_PAYMENT: 'PAYP',
  INCOME: 'INC',
};

function isCashMode(paymentMode?: string): boolean {
  return (paymentMode ?? '').trim().toUpperCase() === 'CASH';
}

function accountTypeForMode(paymentMode?: string): 'CASH' | 'BANK' {
  return isCashMode(paymentMode) ? 'CASH' : 'BANK';
}

function missingAccountMessage(type: 'CASH' | 'BANK', actionLabel?: string): string {
  const label = type === 'CASH' ? 'Cash in Hand' : 'Bank';
  const verb = type === 'CASH' ? 'create one' : 'add a bank account';
  const doing =
    actionLabel ??
    (type === 'CASH' ? 'recording cash transactions' : 'recording bank transactions');
  return `No ${label} account found for this branch. Please ${verb} under Cash & Bank before ${doing}.`;
}

export interface RequireCashAccountParams {
  branchId: string;
  /** Used to infer CASH vs BANK when requiredType isn't given explicitly. */
  paymentMode?: string;
  /** Explicit account id, if the caller/user already picked one. */
  explicitAccountId?: string;
  /** Names the action in the error message, e.g. 'depositing/clearing cheques'. */
  actionLabel?: string;
  /** Forces CASH or BANK regardless of paymentMode — e.g. cheques always need BANK. */
  requiredType?: 'CASH' | 'BANK';
}

/**
 * Resolve the cash/bank account a movement must hit, or throw with a specific,
 * user-facing message naming exactly what's missing (Cash vs Bank) and what to do.
 * Explicit id wins (validated to exist, belong to this branch, and be the required
 * type — an id from another branch, a stale/deleted id, or the wrong account type is
 * never silently accepted); otherwise CASH method → branch CASH account, anything
 * else → branch BANK account, preferring the branch's default account of that type
 * and falling back to the first active one.
 *
 * This never returns null — every cash-affecting action must have a real account
 * behind it before it's allowed to proceed.
 */
export async function requireCashAccount(
  db: EntityManager | DataSource,
  params: RequireCashAccountParams,
): Promise<CashBankAccount> {
  const { branchId, paymentMode, explicitAccountId, actionLabel, requiredType } = params;
  const type = requiredType ?? accountTypeForMode(paymentMode);
  const repo = db.getRepository(CashBankAccount);
  if (explicitAccountId) {
    const account = await repo.findOne({ where: { id: explicitAccountId, branchId } });
    if (!account) {
      throw new AppError(
        'The selected Cash/Bank account could not be found for this branch — it may have been removed. Please choose a valid account under Cash & Bank.',
        400,
      );
    }
    if (account.type !== type) {
      const need = type === 'CASH' ? 'a Cash in Hand' : 'a Bank';
      const got = account.type === 'CASH' ? 'a Cash in Hand' : 'a Bank';
      throw new AppError(
        `The selected account is ${got} account, but ${need} account is required for this action. Please choose ${need} account under Cash & Bank.`,
        400,
      );
    }
    return account;
  }
  const account = await repo
    .createQueryBuilder('a')
    .where('a.branchId = :branchId', { branchId })
    .andWhere('a.type = :type', { type })
    .andWhere('a.isActive = :active', { active: true })
    .orderBy('a.isDefault', 'DESC')
    .addOrderBy('a.createdAt', 'ASC')
    .getOne();
  if (!account) {
    throw new AppError(missingAccountMessage(type, actionLabel), 400);
  }
  return account;
}

function buildReferenceNo(input: PostCashbookEntryInput): string {
  if (input.referenceNo) return input.referenceNo;
  const prefix = (input.sourceType && REF_PREFIX[input.sourceType]) || 'CB';
  // sourceId is a UUID → globally unique, so the referenceNo cannot collide.
  return input.sourceId ? `${prefix}-${input.sourceId}` : `${prefix}-${Date.now()}`;
}

/**
 * Single idempotent entry point for writing a cashbook (day book) entry and moving the
 * linked cash/bank account balance. Used by manual entry, invoice-receipt posting, and
 * expense-payment posting so every cash movement lands in the day book consistently.
 */
export async function postCashbookEntry(input: PostCashbookEntryInput): Promise<CashbookEntry> {
  return Source.transaction(async (em) => {
    const entryRepo = em.getRepository(CashbookEntry);

    // Idempotency: never post the same source twice.
    if (input.sourceType && input.sourceId) {
      const existing = await entryRepo.findOne({
        where: { sourceType: input.sourceType, sourceId: input.sourceId },
      });
      if (existing) {
        logger.debug(
          `Cashbook entry already exists for ${input.sourceType}:${input.sourceId} — skipping`,
        );
        return existing;
      }
    }

    // A cashbook entry always represents a real cash/bank movement — silently
    // recording one with no account behind it (previously "best effort") let the
    // parent action (an invoice payment, an expense marked paid, ...) report
    // success while the money went nowhere. This now blocks instead.
    const account = await requireCashAccount(em, {
      branchId: input.branchId,
      paymentMode: input.paymentMode,
      explicitAccountId: input.accountId,
    });

    const entry = entryRepo.create({
      referenceNo: buildReferenceNo(input),
      date: typeof input.date === 'string' ? new Date(input.date) : input.date,
      accountId: account.id,
      entryType: input.entryType,
      amount: input.amount,
      category: input.category,
      description: input.description,
      linkedInvoiceId: input.linkedInvoiceId,
      linkedPoId: input.linkedPoId,
      linkedExpenseId: input.linkedExpenseId,
      paymentMode: input.paymentMode,
      chequeNo: input.chequeNo,
      notes: input.notes,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      createdBy: input.createdBy,
      branchId: input.branchId,
    });
    const saved = await entryRepo.save(entry);

    // Move the account balance atomically with the entry.
    const accountRepo = em.getRepository(CashBankAccount);
    const delta = input.entryType === 'RECEIPT' ? Number(input.amount) : -Number(input.amount);
    account.currentBalance = Number(account.currentBalance) + delta;
    await accountRepo.save(account);

    return saved;
  });
}
