export type ReturnedMachineDisposition = 'STOCK' | 'WORKING_STOCK' | 'DAMAGED';
export type ReturnedProductStatus = 'RETURNED' | 'AVAILABLE' | 'DAMAGED';

export function requiresReturnedMachineDisposition(input: {
  itemCategory?: string | null;
  type?: string | null;
}): boolean {
  return (
    input.itemCategory === 'PRODUCT' &&
    (input.type === 'REPLACEMENT' || input.type === 'CREDIT_EXCHANGE')
  );
}

export function isReturnedMachineDisposition(value: unknown): value is ReturnedMachineDisposition {
  return value === 'STOCK' || value === 'WORKING_STOCK' || value === 'DAMAGED';
}

/** Translate Finance's choice to the inventory service's product status. */
export function getReturnedProductStatus(
  disposition?: ReturnedMachineDisposition | null,
  legacyDamageReason?: string | null,
): ReturnedProductStatus {
  if (disposition === 'WORKING_STOCK') return 'AVAILABLE';
  if (disposition === 'DAMAGED') return 'DAMAGED';
  if (disposition === 'STOCK') return 'RETURNED';

  // Keep the prior behavior for older credit notes created before disposition existed.
  return legacyDamageReason === 'Damaged Product' ? 'DAMAGED' : 'RETURNED';
}
