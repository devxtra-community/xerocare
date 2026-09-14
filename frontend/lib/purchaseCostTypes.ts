/**
 * The additional costs a purchase lot can carry beyond the vendor's own invoice.
 *
 * Shared by the Add Cost form and the Add Vendor Payment form's Additional Cost mode so
 * the two cannot drift — the label chosen here is what the backend buckets into a
 * chart-of-accounts line (Labour → 5014, Customs/Duty → 5015, Documentation → purchase
 * cost, everything else → 5005 Shipping & Handling), matched on a keyword so a
 * hand-typed "Other" label still reaches a real account instead of nowhere.
 */
export const PURCHASE_COST_TYPES = [
  'Labour',
  'Handling',
  'Shipping',
  'Documentation',
  'Transportation',
  'Groundfield',
  'Customs Duty',
  'Other',
] as const;

export type PurchaseCostType = (typeof PURCHASE_COST_TYPES)[number];

/**
 * Which Additional Costs line an itemised cost row belongs under.
 *
 * Mirrors the backend's bucketForCostType (ven_inv_service/src/utils/purchaseCostBuckets)
 * so the lot page and the chart of accounts agree on where a charge belongs. Matched on a
 * keyword because "Other" lets a user type their own label — "Port handling charges"
 * should land under Handling rather than disappear.
 */
export function costLineForType(costType: string | null | undefined): string {
  const t = String(costType ?? '')
    .trim()
    .toUpperCase();
  if (t.includes('LABOUR') || t.includes('LABOR')) return 'Labour';
  if (t.includes('DOCUMENT')) return 'Documentation';
  if (t.includes('HANDLING')) return 'Handling';
  if (t.includes('TRANSPORT')) return 'Transportation';
  if (t.includes('GROUNDFIELD') || t.includes('GROUND')) return 'Groundfield';
  if (t.includes('CUSTOM') || t.includes('DUTY')) return 'Customs Duty';
  if (t.includes('SHIP') || t.includes('FREIGHT')) return 'Shipping';
  return 'Other';
}

/** The order the Additional Costs breakdown is listed in. */
export const COST_LINE_ORDER = [
  'Documentation',
  'Labour',
  'Handling',
  'Transportation',
  'Shipping',
  'Groundfield',
  'Customs Duty',
  'Other',
] as const;
