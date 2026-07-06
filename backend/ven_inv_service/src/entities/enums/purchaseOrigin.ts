/**
 * Classifies a purchase by comparing the vendor's country to the purchasing
 * branch's country. Snapshotted once at RFQ award time and never recalculated,
 * so historical spend reporting stays stable even if a vendor's country is
 * edited later.
 */
export enum PurchaseOrigin {
  DOMESTIC = 'DOMESTIC',
  INTERNATIONAL = 'INTERNATIONAL',
}

/**
 * Pure classification rule. Returns INTERNATIONAL when either country is unknown
 * (safer default for spend visibility — an unverified origin is treated as
 * cross-border rather than silently counted as domestic).
 */
export function classifyPurchaseOrigin(
  branchCountryCode?: string | null,
  vendorCountryCode?: string | null,
): PurchaseOrigin {
  if (!branchCountryCode || !vendorCountryCode) {
    return PurchaseOrigin.INTERNATIONAL;
  }
  return branchCountryCode.trim().toUpperCase() === vendorCountryCode.trim().toUpperCase()
    ? PurchaseOrigin.DOMESTIC
    : PurchaseOrigin.INTERNATIONAL;
}
