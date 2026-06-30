import { EntityManager } from 'typeorm';
import { Source } from '../config/dataSource';
import { CashbookEntry } from '../entities/cashbookEntryEntity';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
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
  /** When true and no accountId given, auto-map the account from paymentMode (used by auto-posting). */
  autoResolveAccount?: boolean;
}

const REF_PREFIX: Record<string, string> = {
  INVOICE_PAYMENT: 'RCPT',
  EXPENSE: 'EXP',
};

function isCashMode(paymentMode?: string): boolean {
  return (paymentMode ?? '').trim().toUpperCase() === 'CASH';
}

/**
 * Resolve the cash/bank account a movement should hit.
 * Explicit id wins; otherwise CASH method → branch CASH account, anything else → branch BANK account.
 * Prefers the branch's default account of that type, falling back to the first active one.
 * Returns null when no suitable account exists (entry is still recorded; balance just doesn't move).
 */
export async function resolveCashAccount(
  em: EntityManager,
  branchId: string,
  paymentMode?: string,
  explicitAccountId?: string,
): Promise<CashBankAccount | null> {
  const repo = em.getRepository(CashBankAccount);
  if (explicitAccountId) {
    return repo.findOne({ where: { id: explicitAccountId } });
  }
  const type = isCashMode(paymentMode) ? 'CASH' : 'BANK';
  return repo
    .createQueryBuilder('a')
    .where('a.branchId = :branchId', { branchId })
    .andWhere('a.type = :type', { type })
    .andWhere('a.isActive = :active', { active: true })
    .orderBy('a.isDefault', 'DESC')
    .addOrderBy('a.createdAt', 'ASC')
    .getOne();
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

    let account: CashBankAccount | null = null;
    if (input.accountId) {
      account = await em.getRepository(CashBankAccount).findOne({ where: { id: input.accountId } });
    } else if (input.autoResolveAccount) {
      account = await resolveCashAccount(em, input.branchId, input.paymentMode);
    }

    const entry = entryRepo.create({
      referenceNo: buildReferenceNo(input),
      date: typeof input.date === 'string' ? new Date(input.date) : input.date,
      accountId: account?.id,
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
    if (account) {
      const accountRepo = em.getRepository(CashBankAccount);
      const delta = input.entryType === 'RECEIPT' ? Number(input.amount) : -Number(input.amount);
      account.currentBalance = Number(account.currentBalance) + delta;
      await accountRepo.save(account);
    }

    return saved;
  });
}
