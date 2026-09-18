import type { CreditNoteRecord } from './invoice';

/**
 * What a credit note actually settles, in the customer's terms.
 *
 * Mirrors `backend/billing_service/src/utils/creditNoteSettlement.ts` exactly — the
 * document must state the same figure Accounts will collect or refund, or the customer is
 * handed a paper that disagrees with their account.
 *
 * Two rules come from the ordinary sale path rather than being invented here:
 *  1. VAT is EXCLUSIVE — added on top of the consideration, never extracted from it.
 *  2. VAT is charged on the consideration ACTUALLY payable, i.e. after the discount.
 */

export type SettlementDirection =
  /** Customer pays us — they traded up. */
  | 'CUSTOMER_PAYS'
  /** We pay the customer — a refund, or they traded down. */
  | 'COMPANY_REFUNDS'
  /** Nothing changes hands — a like-for-like replacement, or an even swap. */
  | 'NO_MOVEMENT';

export interface CreditNoteSettlement {
  /** Value of the item the customer returned, excluding tax. */
  returnedNet: number;
  returnedTax: number;
  returnedGross: number;
  /** Value of the item they received back, excluding tax. 0 for a money-back return. */
  replacementNet: number;
  replacementTax: number;
  replacementGross: number;
  /** Goodwill discount applied to the replacement. */
  discount: number;
  /** Signed, pre-tax: positive = customer owes, negative = we owe. */
  netDifference: number;
  /** Tax on the difference, at the originating invoice's rate. */
  differenceTax: number;
  /** What actually changes hands. Always positive. */
  settlementAmount: number;
  direction: SettlementDirection;
  taxPercent: number;
  taxName: string;
}

const r2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function computeCreditNoteSettlement(cn: CreditNoteRecord): CreditNoteSettlement {
  const taxPercent = Number(cn.taxPercent ?? 0);
  const taxName = cn.taxName || 'VAT';

  const returnedNet = r2(Number(cn.productAmount ?? 0));
  // The stored taxAmount is what was charged on the original sale line; fall back to the
  // rate only when it is absent, so the document never contradicts the invoice.
  const returnedTax = r2(Number(cn.taxAmount ?? returnedNet * (taxPercent / 100)));

  const isExchange = cn.type === 'CREDIT_EXCHANGE';
  const isReplacement = cn.type === 'REPLACEMENT';
  const hasReplacement = isExchange || isReplacement;

  const replacementNet = hasReplacement ? r2(Number(cn.replacementAmount ?? 0)) : 0;
  const discount = hasReplacement ? Math.max(0, r2(Number(cn.replacementDiscount ?? 0))) : 0;
  const replacementTax = hasReplacement
    ? r2(Math.max(0, replacementNet - discount) * (taxPercent / 100))
    : 0;

  if (cn.type === 'DIRECT_REFUND') {
    // The customer gets back what they paid: price plus the tax charged on it. Refunding
    // only the net would keep tax the business collected on their behalf.
    const settlementAmount = r2(returnedNet + returnedTax);
    return {
      returnedNet,
      returnedTax,
      returnedGross: settlementAmount,
      replacementNet: 0,
      replacementTax: 0,
      replacementGross: 0,
      discount: 0,
      netDifference: -returnedNet,
      differenceTax: -returnedTax,
      settlementAmount,
      direction: settlementAmount > 0.005 ? 'COMPANY_REFUNDS' : 'NO_MOVEMENT',
      taxPercent,
      taxName,
    };
  }

  if (isReplacement) {
    // A like-for-like warranty swap changes no consideration, so nothing is owed either
    // way — whatever the two machines are individually worth.
    return {
      returnedNet,
      returnedTax,
      returnedGross: r2(returnedNet + returnedTax),
      replacementNet,
      replacementTax,
      replacementGross: r2(replacementNet + replacementTax),
      discount,
      netDifference: 0,
      differenceTax: 0,
      settlementAmount: 0,
      direction: 'NO_MOVEMENT',
      taxPercent,
      taxName,
    };
  }

  // CREDIT_EXCHANGE — the discount reduces what the customer owes, so it must reduce the
  // difference. This is the same figure the receivable/payable is raised for.
  const netDifference = r2(replacementNet - returnedNet - discount);
  const differenceTax = r2(Math.abs(netDifference) * (taxPercent / 100));
  const settlementAmount = r2(Math.abs(netDifference) + differenceTax);

  return {
    returnedNet,
    returnedTax,
    returnedGross: r2(returnedNet + returnedTax),
    replacementNet,
    replacementTax,
    replacementGross: r2(replacementNet + replacementTax),
    discount,
    netDifference,
    differenceTax: netDifference >= 0 ? differenceTax : -differenceTax,
    settlementAmount,
    direction:
      settlementAmount < 0.005
        ? 'NO_MOVEMENT'
        : netDifference > 0
          ? 'CUSTOMER_PAYS'
          : 'COMPANY_REFUNDS',
    taxPercent,
    taxName,
  };
}

/** Plain-language line for the document, so nobody has to infer who owes whom. */
export function settlementNarrative(cn: CreditNoteRecord, s: CreditNoteSettlement): string {
  const name = cn.customerName || 'The customer';
  switch (cn.type) {
    case 'DIRECT_REFUND':
      return `${name} returned the item above. The full amount paid, including ${s.taxName}, is refundable to ${name}. No replacement was issued.`;
    case 'REPLACEMENT':
      return `The item above was replaced like-for-like under warranty. No money is payable in either direction — this document records the exchange of goods only.`;
    default:
      if (s.direction === 'CUSTOMER_PAYS')
        return `The replacement is of higher value than the item returned. ${name} is required to pay the difference shown below before the exchange is complete.`;
      if (s.direction === 'COMPANY_REFUNDS')
        return `The replacement is of lower value than the item returned. The difference shown below is refundable to ${name}.`;
      return `The replacement is of equal value to the item returned. No money is payable in either direction.`;
  }
}
