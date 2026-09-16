/**
 * Splitting a vendor amount into its goods value and its tax.
 *
 * A vendor quotes one of two ways, and the difference decides what we owe, what the
 * goods cost, and how much tax we may reclaim:
 *
 *   tax INCLUSIVE — "50,000 including 5% VAT"
 *     the 50,000 is already the full invoice: goods 47,619.05 + VAT 2,380.95.
 *     Extracting the tax is division, not multiplication — multiplying 50,000 by 5%
 *     taxes an amount that already contains the tax and yields 2,500, over-claiming
 *     the difference.
 *
 *   tax EXCLUSIVE — "50,000 plus 5% VAT"
 *     the goods are 50,000, VAT 2,500 is added, and the vendor will invoice 52,500.
 *     The amount owed is therefore larger than the quoted figure.
 *
 * Both cases are normalised here to the same three numbers so everything downstream
 * can stop caring which way it was quoted: `gross` is always what the vendor invoices
 * (and so what is owed), `net` is always the goods value that carries the cost and
 * forms the taxable base, and `tax` is always the reclaimable/self-assessed portion.
 */

export interface TaxSplit {
  /** What the vendor actually invoices — net + tax. This is the amount owed. */
  gross: number;
  /** Goods value excluding tax — the taxable base. */
  net: number;
  /** The tax itself. */
  tax: number;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * @param amount       the figure as quoted by the vendor
 * @param ratePercent  the tax rate; 0 or null means no tax was declared
 * @param taxIncluded  true when `amount` already contains the tax, false when the tax
 *                     is added on top.
 *
 *                     Null/undefined is a distinct third state — "the vendor did not
 *                     answer the Yes/No column" — and is treated as INCLUSIVE, i.e. the
 *                     quoted price is the whole of what is owed. This is the one
 *                     interpretation used everywhere: the RFQ comparison, the award
 *                     screen and this splitter all agree, and the UI labels it "not
 *                     declared" rather than claiming it is excluded. Choosing the other
 *                     direction would silently add tax to a figure the vendor never
 *                     quoted, inflating what we owe them; choosing this one can only
 *                     understate the reclaimable tax, which is visible and correctable.
 */
export function splitPurchaseTax(
  amount: number | null | undefined,
  ratePercent: number | null | undefined,
  taxIncluded: boolean | null | undefined,
): TaxSplit {
  const value = Number(amount ?? 0);
  const rate = Number(ratePercent ?? 0);

  if (!Number.isFinite(value) || value === 0 || !Number.isFinite(rate) || rate <= 0) {
    const flat = Number.isFinite(value) ? r2(value) : 0;
    return { gross: flat, net: flat, tax: 0 };
  }

  if (taxIncluded === false) {
    const net = r2(value);
    const tax = r2(net * (rate / 100));
    return { gross: r2(net + tax), net, tax };
  }

  // Inclusive (and the null default).
  const gross = r2(value);
  const net = r2(gross / (1 + rate / 100));
  // Derive the tax by subtraction rather than its own rounding, so net + tax === gross
  // exactly and the invoice never fails to foot by a stray fils.
  return { gross, net, tax: r2(gross - net) };
}

export interface PurchaseTaxFields {
  vendorNetAmount: number;
  vendorTaxAmount: number;
  taxableAmount: number;
  inputVatAmount: number | null;
  reverseChargeVatAmount: number | null;
}

/**
 * The tax figures for a purchase record.
 *
 * `purchaseAmount` is always the gross vendor invoice — the RFQ→lot conversion folds an
 * exclusive quote's tax into the line prices, so by the time a purchase exists there is
 * only ever one figure and it is what the vendor bills. The tax is therefore always
 * *extracted* from it, never added to it. That is also what makes the payable correct
 * without touching it: `remaining = purchaseAmount − paid` already means "what the
 * vendor is still owed", and the tax is inside that, not on top of it.
 *
 * Additional costs (labour, handling, transport, shipping, groundfield, customs duty)
 * are separate supplies from other parties and keep their existing treatment: entered
 * net, with tax assessed on top of them.
 *
 * Origin decides only where the tax lands — a domestic vendor charges input VAT we
 * reclaim, an import is self-assessed under reverse charge — never whether it exists.
 */
export function computePurchaseTaxFields(params: {
  purchaseAmount: number | null | undefined;
  /** Vendor-declared rate where one was quoted, otherwise the branch's rate. */
  taxRatePercent: number | null | undefined;
  additionalTaxableCosts?: number | null;
  purchaseOrigin?: string | null;
}): PurchaseTaxFields {
  const goods = splitPurchaseTax(params.purchaseAmount, params.taxRatePercent, true);
  const rate = Number(params.taxRatePercent ?? 0);
  const extraCosts = r2(Number(params.additionalTaxableCosts ?? 0));
  const extraTax = rate > 0 ? r2(extraCosts * (rate / 100)) : 0;

  const taxableAmount = r2(goods.net + extraCosts);
  const totalTax = r2(goods.tax + extraTax);

  const isImport = String(params.purchaseOrigin ?? '').toUpperCase() === 'INTERNATIONAL';

  return {
    vendorNetAmount: goods.net,
    vendorTaxAmount: goods.tax,
    taxableAmount,
    inputVatAmount: isImport ? null : totalTax,
    reverseChargeVatAmount: isImport ? totalTax : null,
  };
}

/**
 * What the vendor is actually owed on a purchase.
 *
 * On a DOMESTIC purchase the input VAT inside the vendor's invoice is not settled by
 * paying the vendor — it is settled separately through Accounts' Tax Report (the Proceed
 * → approve → settle workflow). Leaving it in the vendor's outstanding balance meant the
 * same tax was owed twice: once as part of the vendor's remaining balance, and again as
 * the unsettled input VAT that Accounts Payable adds on top. A 15,000 invoice carrying
 * 714.29 of VAT reported 15,714.29 owed, and paying both really did move 15,714.29 of
 * cash for a 15,000 invoice.
 *
 * So the vendor's payable is the goods value, and the tax rides in the tax table. The two
 * together still come to the invoice total — the liability is represented once, in two
 * places that do not overlap.
 *
 * INTERNATIONAL purchases are deliberately untouched: an import is self-assessed under
 * reverse charge, so the foreign vendor never billed local VAT and is owed the whole
 * invoice. Their tax never reaches the local tax table (it filters on DOMESTIC), so there
 * is nothing settled elsewhere to net off.
 *
 * `vendorTaxAmount` is used rather than `inputVatAmount` on purpose: input VAT also
 * covers tax assessed on additional costs (freight, customs, labour), which are supplies
 * from other parties and were never part of what the vendor invoiced.
 */
export function vendorPayableAmount(p: {
  purchaseAmount?: number | string | null;
  vendorTaxAmount?: number | string | null;
  purchaseOrigin?: string | null;
}): number {
  const gross = Number(p.purchaseAmount ?? 0);
  if (!Number.isFinite(gross) || gross <= 0) return 0;

  if (String(p.purchaseOrigin ?? '').toUpperCase() === 'INTERNATIONAL') return r2(gross);

  const vendorTax = Number(p.vendorTaxAmount ?? 0);
  if (!Number.isFinite(vendorTax) || vendorTax <= 0) return r2(gross);

  // Guard against a malformed row claiming more tax than the invoice.
  return r2(Math.max(0, gross - vendorTax));
}
