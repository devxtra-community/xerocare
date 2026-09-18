import {
  PaymentDirection,
  SETTLEMENT_TYPES,
  type SettlementType,
} from '../entities/settlementApproval';

/** Rounds to 2dp the way every other money figure in this service does. */
function money(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export interface ExchangeSettlement {
  /** Pre-tax difference, discount already deducted. Negative = we owe the customer. */
  netAmount: number;
  /** VAT on the net difference, at the credit note's own rate. */
  taxAmount: number;
  /** What actually changes hands: |net| + tax. Always positive. */
  grossAmount: number;
  /** The discount that was deducted in arriving at netAmount. */
  discountAmount: number;
  direction: PaymentDirection;
  settlementType: SettlementType;
  /** True when net and tax both round to zero — nothing to collect or refund. */
  isZero: boolean;
}

/**
 * Works out what a CREDIT_EXCHANGE actually settles.
 *
 * Two rules here are taken from the ordinary sale path rather than invented, so an
 * exchange difference is taxed exactly as the original sale line was
 * (see billingService.createDirectSale):
 *
 *  1. VAT is EXCLUSIVE — tax is added on top of the consideration, never extracted
 *     from it.
 *  2. Tax is levied on the consideration ACTUALLY charged, i.e. after the discount.
 *     Charging VAT on the pre-discount figure would tax money the customer never pays.
 *
 * `taxPercent` is the rate the credit note copied off the originating invoice at
 * creation. Using that, rather than looking the branch rate up again, is what makes an
 * exchange on a VAT-exempt customer's invoice correctly come out at zero tax: the
 * invoice was written at 0, so the credit note carries 0, so the difference is taxed at
 * 0 — without this function needing to know anything about exemption.
 */
export function computeExchangeSettlement(input: {
  originalAmount: number;
  replacementAmount: number;
  replacementDiscount?: number;
  taxPercent?: number | null;
}): ExchangeSettlement {
  const original = Number(input.originalAmount) || 0;
  const replacement = Number(input.replacementAmount) || 0;
  const discount = Math.max(0, Number(input.replacementDiscount) || 0);
  const rate = Number(input.taxPercent) || 0;

  // The discount reduces what the customer owes, so it must reduce the net difference.
  // This is the same figure the receivable is raised for AND the same figure revenue
  // moves by — the two disagreeing is what previously left the discount unaccounted.
  const netAmount = money(replacement - original - discount);
  const taxAmount = money(Math.abs(netAmount) * (rate / 100));
  const grossAmount = money(Math.abs(netAmount) + taxAmount);

  const owedByCustomer = netAmount > 0;
  return {
    netAmount,
    taxAmount,
    grossAmount,
    discountAmount: discount,
    direction: owedByCustomer
      ? PaymentDirection.CUSTOMER_TO_COMPANY
      : PaymentDirection.COMPANY_TO_CUSTOMER,
    settlementType: owedByCustomer
      ? SETTLEMENT_TYPES.CREDIT_EXCHANGE_RECEIPT
      : SETTLEMENT_TYPES.CREDIT_EXCHANGE_REFUND,
    isZero: grossAmount < 0.005,
  };
}

/**
 * What a DIRECT_REFUND hands back: the price of the item plus the VAT charged on it,
 * because that is what the customer actually paid. Refunding only the net would keep
 * the tax the business collected on their behalf.
 */
export function computeRefundSettlement(input: {
  productAmount: number;
  taxAmount?: number | null;
}): { netAmount: number; taxAmount: number; grossAmount: number } {
  const netAmount = money(Number(input.productAmount) || 0);
  const taxAmount = money(Number(input.taxAmount) || 0);
  return { netAmount, taxAmount, grossAmount: money(netAmount + taxAmount) };
}
