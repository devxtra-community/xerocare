/**
 * Domestic vs International purchase classification — mirrors the backend enum
 * (backend/ven_inv_service/src/entities/enums/purchaseOrigin.ts). Snapshotted at
 * RFQ award time and carried onto lots and purchases.
 */
export enum PurchaseOrigin {
  DOMESTIC = 'DOMESTIC',
  INTERNATIONAL = 'INTERNATIONAL',
}

export interface SpendByOrigin {
  domestic: number;
  international: number;
  unclassified: number;
}

export const PURCHASE_ORIGIN_META: Record<PurchaseOrigin, { label: string; className: string }> = {
  [PurchaseOrigin.DOMESTIC]: {
    label: 'Domestic',
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400',
  },
  [PurchaseOrigin.INTERNATIONAL]: {
    label: 'International',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
  },
};
