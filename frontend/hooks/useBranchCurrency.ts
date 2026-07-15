'use client';

import { useEffect, useSyncExternalStore } from 'react';
import {
  FALLBACK_CURRENCY,
  getActiveCurrency,
  initBranchCurrency,
  subscribeCurrency,
} from '@/lib/currency';

/**
 * Reactive branch currency code for React components.
 * Triggers a one-time fetch of the user's branch if not yet loaded.
 */
export function useBranchCurrency(): string {
  const currency = useSyncExternalStore(
    subscribeCurrency,
    getActiveCurrency,
    () => FALLBACK_CURRENCY,
  );

  useEffect(() => {
    initBranchCurrency();
  }, []);

  return currency;
}
