import { UsageRecord } from '../entities/usageRecordEntity';
import { SalePaymentRequest } from '../entities/salePaymentRequestEntity';

/**
 * The single definition of "how much does this bill still owe".
 *
 * This existed in three separate places before, each re-deriving it and each carrying its
 * own guard against the same trap — and a fourth consumer (applying a security deposit to
 * a bill) missed the guard entirely and let a deposit settle a bill that was already paid
 * at contract signing. Anything that needs a bill's collected/outstanding figure must come
 * through here so they cannot drift apart again.
 */

/**
 * ADVANCE and SECURITY_DEPOSIT bills are documents WRAPPING money collected elsewhere:
 * the first month's advance and the security deposit are taken at conversion through the
 * RENT_ADVANCE / RENT_SECURITY_DEPOSIT (or LEASE_*) payment flow, which links those
 * payments to the contract by invoiceId + paymentContext and never by usageRecordId.
 *
 * So a usageRecordId join finds nothing against them and would report their entire charge
 * as unpaid. They are settled by definition the moment they exist — there is no Stage B
 * collection for them.
 */
export function isWrappedBill(billType?: string | null): boolean {
  return billType === 'ADVANCE' || billType === 'SECURITY_DEPOSIT';
}

/** Payments that count towards a bill: anything not rejected, linked by usageRecordId. */
export function sumBillPayments(payments: SalePaymentRequest[]): number {
  return payments
    .filter((p) => p.status !== 'REJECTED' && p.usageRecordId)
    .reduce((sum, p) => sum + Number(p.amount), 0);
}

/** The payment mode written by applySecurityDepositToBill — money that came out of the
 *  held security deposit rather than a fresh receipt. */
export const DEPOSIT_ADJUSTMENT_MODE = 'SECURITY_DEPOSIT_ADJUSTMENT';

export interface BillSettlement {
  totalCharge: number;
  collected: number;
  outstanding: number;
  /** Of `collected`, how much came out of the customer's security deposit. Shown
   *  separately so Finance can see "AED 300 settled from deposit, AED 960 still to
   *  collect" instead of a single opaque figure. */
  depositApplied: number;
  /** True when the bill wraps money collected through another flow. */
  wrapped: boolean;
}

/**
 * @param bill      the UsageRecord
 * @param payments  SalePaymentRequests already filtered to this bill's usageRecordId
 */
export function computeBillSettlement(
  bill: Pick<UsageRecord, 'billType' | 'totalCharge'>,
  payments: SalePaymentRequest[],
): BillSettlement {
  const totalCharge = Number(bill.totalCharge || 0);
  const wrapped = isWrappedBill(bill.billType);

  if (wrapped) {
    // Reported as fully collected — showing it as pending would be actively misleading
    // and invites a double collection.
    return { totalCharge, collected: totalCharge, outstanding: 0, depositApplied: 0, wrapped };
  }

  const counted = payments.filter((p) => p.status !== 'REJECTED' && p.usageRecordId);
  const collected = counted.reduce((sum, p) => sum + Number(p.amount), 0);
  const depositApplied = counted
    .filter((p) => p.paymentMode === DEPOSIT_ADJUSTMENT_MODE)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    totalCharge,
    collected,
    depositApplied,
    outstanding: Math.max(0, totalCharge - collected),
    wrapped,
  };
}
