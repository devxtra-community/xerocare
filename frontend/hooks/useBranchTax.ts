'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { getBranchTaxPercent, initBranchCurrency, subscribeBranchTax } from '@/lib/currency';

/**
 * Reactive branch tax rate (percent) for React components.
 * Shares the one /branch/my-branch fetch with useBranchCurrency, so mounting
 * both costs a single request. Branches without tax read 0.
 */
export function useBranchTax(): number {
  const taxPercent = useSyncExternalStore(subscribeBranchTax, getBranchTaxPercent, () => 0);

  useEffect(() => {
    initBranchCurrency();
  }, []);

  return taxPercent;
}
