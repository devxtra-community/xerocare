/**
 * Shared vocabulary for the Accounts settlement-approval gate that sits between a Credit
 * Note being agreed and real money moving.
 *
 * These live on the existing ManualReceivable / ManualPayable rows rather than in a table
 * of their own. Those two rows are ALREADY the ledger the credit-note flow writes to, they
 * already carry amount/outstanding/status/branch/createdBy, and they are already listed by
 * the Receivables and Payables pages and summed by the Balance Sheet. Adding a parallel
 * approval table would have meant a second source of truth for the same money — the exact
 * duplicate-AR problem this work exists to remove.
 */

/** Which way the money actually travels. Decides collection vs refund in Accounts. */
export enum PaymentDirection {
  /** Customer pays us — e.g. they upgraded and owe the difference. */
  CUSTOMER_TO_COMPANY = 'CUSTOMER_TO_COMPANY',
  /** We pay the customer — a refund, or a downgrade difference. */
  COMPANY_TO_CUSTOMER = 'COMPANY_TO_CUSTOMER',
}

/**
 * Accounts' decision on the request. Deliberately separate from the row's own
 * `status` (PENDING/PARTIAL/PAID), which tracks whether the money has actually moved.
 * APPROVED means "Accounts authorised this"; it does NOT mean paid.
 */
export enum SettlementApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** Settlement request types, as named in the Credit Note workflow spec. */
export const SETTLEMENT_TYPES = {
  /** Money back on a DIRECT_REFUND credit note. */
  CUSTOMER_REFUND: 'CUSTOMER_REFUND',
  /** Exchange where the replacement costs more — customer owes us. */
  CREDIT_EXCHANGE_RECEIPT: 'CREDIT_EXCHANGE_RECEIPT',
  /** Exchange where the replacement costs less — we owe the customer. */
  CREDIT_EXCHANGE_REFUND: 'CREDIT_EXCHANGE_REFUND',
} as const;

export type SettlementType = (typeof SETTLEMENT_TYPES)[keyof typeof SETTLEMENT_TYPES];

/** Every settlement type that must clear the Accounts approval gate before money moves. */
export const APPROVAL_GATED_TYPES: string[] = [
  SETTLEMENT_TYPES.CUSTOMER_REFUND,
  SETTLEMENT_TYPES.CREDIT_EXCHANGE_RECEIPT,
  SETTLEMENT_TYPES.CREDIT_EXCHANGE_REFUND,
];

/**
 * True when this ledger row came from the Credit Note workflow and therefore may not be
 * settled until Accounts has approved it.
 *
 * Gated on creditNoteId rather than on `type` alone so that pre-existing rows — and any
 * row a user typed by hand with a coincidental type — keep their previous behaviour. Only
 * rows this workflow created carry a creditNoteId.
 */
export function requiresSettlementApproval(row: {
  creditNoteId?: string | null;
  type?: string | null;
}): boolean {
  return !!row.creditNoteId && APPROVAL_GATED_TYPES.includes(row.type ?? '');
}
