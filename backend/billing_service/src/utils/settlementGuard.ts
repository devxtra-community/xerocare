import { AppError } from '../errors/appError';
import {
  SettlementApprovalStatus,
  requiresSettlementApproval,
} from '../entities/settlementApproval';

/** The subset of a ManualReceivable/ManualPayable this guard needs. */
export interface SettleableRow {
  id: string;
  type?: string | null;
  status?: string | null;
  amount: number | string;
  amountPaid?: number | string | null;
  outstanding?: number | string | null;
  creditNoteId?: string | null;
  approvalStatus?: string | null;
  rejectionReason?: string | null;
}

/**
 * Server-side gate on settling a Credit Note receivable/payable.
 *
 * Everything here is enforced on the server on purpose. The UI hides the Settle button
 * on an unapproved row, but hiding a button is not a control — the endpoint is reachable
 * directly, and these are the rules that actually stop money moving:
 *
 *  - a credit-note row cannot be settled until Accounts has APPROVED it;
 *  - a REJECTED row can never be settled;
 *  - an already-settled row cannot be settled again (idempotency against double-clicks
 *    and retries);
 *  - the settlement amount is validated against the row's own outstanding balance, read
 *    from the database — never from the request — so a caller cannot refund more than
 *    was approved.
 *
 * Returns the validated amount to settle.
 */
export function assertSettleable(
  row: SettleableRow,
  requestedAmount: unknown,
  label: 'refund' | 'payment' = 'payment',
): number {
  if (requiresSettlementApproval(row)) {
    const approval = row.approvalStatus ?? SettlementApprovalStatus.PENDING;
    if (approval === SettlementApprovalStatus.REJECTED) {
      throw new AppError(
        `This ${label} was rejected by Accounts${row.rejectionReason ? ` — ${row.rejectionReason}` : ''}. A rejected request cannot be paid.`,
        400,
      );
    }
    if (approval !== SettlementApprovalStatus.APPROVED) {
      throw new AppError(
        `This ${label} is still awaiting Accounts approval. It must be approved before any money moves.`,
        400,
      );
    }
  }

  if (row.status === 'PAID') {
    throw new AppError(`This ${label} has already been settled in full.`, 400);
  }

  const amount = Number(requestedAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('Settlement amount must be a positive number.', 400);
  }

  // Derive the ceiling from stored figures rather than trusting `outstanding`, which is a
  // cached column: if it ever drifts from amount − amountPaid, the stricter of the two
  // wins so a drifted row can never let more money out than the request is worth.
  const total = Number(row.amount) || 0;
  const paid = Number(row.amountPaid) || 0;
  const derived = total - paid;
  const stored = row.outstanding == null ? derived : Number(row.outstanding);
  const ceiling = Math.min(derived, stored);

  if (amount > ceiling + 0.005) {
    throw new AppError(
      `Settlement amount ${amount.toFixed(2)} exceeds the outstanding balance of ${ceiling.toFixed(2)}.`,
      400,
    );
  }
  return amount;
}
