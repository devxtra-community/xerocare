import { EntityManager } from 'typeorm';
import { UsageRecord } from '../entities/usageRecordEntity';

/** Document-number prefix for bills — mirrors the invoice repository's QTN-YYYY-NNNN. */
const PREFIX = 'BILL';

/**
 * Allocates the next bill document number (BILL-YYYY-NNNN).
 *
 * Reads the highest number already issued this year rather than counting rows, so a
 * deleted bill never causes a number to be handed out twice — the same approach
 * invoiceRepository.generateInvoiceNumber() takes.
 *
 * Pass the transaction's EntityManager when creating a bill inside one, so the read sees
 * that transaction's own uncommitted rows. The column carries a UNIQUE constraint, so if
 * two requests do race the loser's INSERT fails rather than silently duplicating a
 * number — callers should retry via `withBillNumber`.
 */
export async function generateBillNumber(manager: EntityManager): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${PREFIX}-${year}-`;

  // Ordered by the numeric suffix rather than the whole string: once the sequence passes
  // 9999 the padding stops equalising width, and '9999' sorts above '10000' as text.
  // The `::int` cast on the parameter is load-bearing — see invoiceNumber.ts for why
  // omitting it makes Postgres read the offset as a regex and return NULL.
  const latest = await manager
    .createQueryBuilder(UsageRecord, 'u')
    .select('MAX(SUBSTRING(u."billNumber" FROM :from::int)::int)', 'max')
    .where('u."billNumber" LIKE :pattern', { pattern: `${prefix}%` })
    .setParameter('from', prefix.length + 1)
    .getRawOne<{ max: number | null }>();

  const next = (latest?.max ?? 0) + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

/** Postgres unique-violation SQLSTATE. */
const UNIQUE_VIOLATION = '23505';

/**
 * Runs `save` with a freshly allocated bill number, retrying on the unique-violation that
 * a concurrent bill creation would cause. Two bills are only ever generated concurrently
 * by the periodic-billing cron racing a Finance user, which is rare — a handful of
 * retries settles it without serialising every bill creation behind a lock.
 */
export async function withBillNumber<T>(
  manager: EntityManager,
  save: (billNumber: string) => Promise<T>,
  attempts = 5,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await save(await generateBillNumber(manager));
    } catch (err) {
      const code = (err as { code?: string })?.code;
      const isDuplicateBillNumber =
        code === UNIQUE_VIOLATION && String((err as Error).message).includes('billNumber');
      if (!isDuplicateBillNumber || attempt >= attempts) throw err;
    }
  }
}
