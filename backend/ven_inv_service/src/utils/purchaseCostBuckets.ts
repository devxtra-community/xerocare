/**
 * Where an itemised purchase cost lands in the chart of accounts.
 *
 * The `purchases` table carries one typed column per cost kind (shipping_cost,
 * labour_cost, …) and the Accounts cost-report has always aggregated those. But the
 * "Add Cost" flow writes `purchase_costs` rows instead, leaving every typed column at
 * zero — so an itemised cost bumped the lot's total and then never appeared in the P&L
 * at all. These buckets let the report read both without double-counting: the typed
 * columns and the itemised rows are parallel stores, never two records of one cost.
 *
 * The bucket names match the fields Billing already consumes (accountsShared.ts).
 */
export type PurchaseCostBucket =
  | 'SHIPPING_HANDLING' // 5005
  | 'IMPORT_LABOUR' // 5014
  | 'CUSTOMS_DUTY' // 5015
  | 'DOCUMENTATION'; // folded into vendor purchase cost, as documentation_fee is

/**
 * Free-text cost types are matched case-insensitively on a keyword, because the
 * "Other" option lets a user type their own label — "Port handling charges" should
 * still reach the handling bucket rather than silently vanishing into a default.
 */
export function bucketForCostType(costType: string | null | undefined): PurchaseCostBucket {
  const t = String(costType ?? '')
    .trim()
    .toUpperCase();

  if (t.includes('LABOUR') || t.includes('LABOR')) return 'IMPORT_LABOUR';
  if (t.includes('CUSTOM') || t.includes('DUTY')) return 'CUSTOMS_DUTY';
  if (t.includes('DOCUMENT')) return 'DOCUMENTATION';
  // Shipping, Handling, Transportation, Groundfield and anything unrecognised — the
  // catch-all is a real purchase overhead account rather than nowhere, so an unusual
  // label still reaches the P&L.
  return 'SHIPPING_HANDLING';
}

/** The SQL CASE mirroring bucketForCostType, for the aggregate cost report. */
export const COST_TYPE_BUCKET_SQL = `
  CASE
    WHEN UPPER(pc.cost_type) LIKE '%LABOUR%' OR UPPER(pc.cost_type) LIKE '%LABOR%' THEN 'IMPORT_LABOUR'
    WHEN UPPER(pc.cost_type) LIKE '%CUSTOM%' OR UPPER(pc.cost_type) LIKE '%DUTY%'  THEN 'CUSTOMS_DUTY'
    WHEN UPPER(pc.cost_type) LIKE '%DOCUMENT%'                                     THEN 'DOCUMENTATION'
    ELSE 'SHIPPING_HANDLING'
  END
`;
