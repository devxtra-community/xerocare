import { Source } from '../config/db';
import { PurchasePayment } from '../entities/purchasePaymentEntity';

/**
 * Auto-generates the "Reference Number" for Cash / Bank Transfer / Credit Card / Online
 * Payment vendor payments — the Add Vendor Payment form used to leave this as a free-text
 * box with no real link back to anything. Cheque payments are untouched: their Cheque
 * Number already IS their reference, so this returns undefined for CHEQUE/unrecognized
 * modes and the caller keeps whatever it was given.
 *
 * Format: <MODE>-<YYYYMMDD>-<seq>, e.g. BANK-20260829-004 — mirrors billing_service's
 * generatePaymentReference (same convention, same non-atomic count-based sequencing —
 * acceptable here for the same reason: a purchase payment is a low-frequency, human-paced
 * action, not a high-concurrency hot path).
 *
 * paymentMethod here is the Title-Case label the frontend actually sends (e.g. "Bank
 * Transfer"), not billing_service's UPPER_SNAKE enum — normalized before lookup.
 */
const REFERENCE_MODE_PREFIX: Record<string, string> = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK',
  CREDIT_CARD: 'CARD',
  ONLINE_PAYMENT: 'ONLINE',
};

export async function generatePaymentReference(
  paymentMethod: string | undefined,
  paymentDate: Date,
): Promise<string | undefined> {
  const normalized = (paymentMethod || '').trim().toUpperCase().replace(/\s+/g, '_');
  const prefix = REFERENCE_MODE_PREFIX[normalized];
  if (!prefix) return undefined;

  const dateStr = paymentDate.toISOString().split('T')[0].replace(/-/g, '');
  const likePattern = `${prefix}-${dateStr}-%`;

  // PurchasePayment's DB column is snake_case (reference_number) — unlike some
  // billing_service tables, which mix camelCase and snake_case per-table. Confirmed
  // against purchasePaymentEntity.ts's @Column({ name: 'reference_number' }).
  const count = await Source.getRepository(PurchasePayment)
    .createQueryBuilder('p')
    .where('p."reference_number" LIKE :p', { p: likePattern })
    .getCount();

  const seq = String(count + 1).padStart(3, '0');
  return `${prefix}-${dateStr}-${seq}`;
}
