/**
 * Service and machine cost for a catalog spare part is its catalog selling
 * price at the time the service line is persisted. Keep this separate from
 * the customer charge, which may be zero under contract coverage.
 */
export function calculateCatalogServicePartCost(
  catalogSellingPrice: number | string | null | undefined,
  quantity: number,
): { unitCost: number; totalCost: number } {
  // Convert to integer minor units before multiplying so decimal currency
  // values do not accumulate binary floating-point fractions.
  const parsedPrice = Number(catalogSellingPrice) || 0;
  const unitCents = Math.round(parsedPrice * 100);
  const quantityUnits = Number(quantity) || 0;

  return {
    unitCost: unitCents / 100,
    totalCost: (unitCents * quantityUnits) / 100,
  };
}
