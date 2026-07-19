'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchExchangeRates } from './finance/accountsApi';
import { formatCurrency } from './format';

/**
 * Frontend mirror of billing_service's accountsShared.ts loadExchangeRates/convertAmt —
 * same semantics (map of fromCurrency -> rate-to-target, target always maps to 1),
 * kept in sync deliberately since both sides must treat a missing rate as "unknown"
 * rather than silently converting at some wrong implied rate.
 */
export function useExchangeRateMap(targetCurrency: string): Map<string, number> {
  const { data } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: fetchExchangeRates,
    staleTime: 5 * 60 * 1000,
  });

  const map = new Map<string, number>();
  map.set(targetCurrency, 1);
  for (const r of data ?? []) {
    if (r.toCurrency === targetCurrency) map.set(r.fromCurrency, Number(r.rate));
  }
  return map;
}

/**
 * Converts amount from fromCurrency to targetCurrency.
 * explicitRate (e.g. a snapshotted rate captured on the record at creation, such as
 * Purchase.exchangeRate) takes priority over the live rates map, since a historical
 * transaction should be re-displayed at the rate that applied when it happened, not
 * today's rate. Returns null when no rate is available either way.
 */
export function convertAmount(
  amount: number,
  fromCurrency: string | null | undefined,
  targetCurrency: string,
  rates: Map<string, number>,
  explicitRate?: number | null,
): number | null {
  const ccy = fromCurrency || targetCurrency;
  if (ccy === targetCurrency) return amount;
  const rate = explicitRate ?? rates.get(ccy);
  if (rate === undefined || rate === null) return null;
  return amount * rate;
}

/**
 * "USD 500.00 (≈ SAR 1,875.00)" when fromCurrency differs from targetCurrency and a
 * rate is available; otherwise falls back to a plain single-currency amount.
 */
export function formatDualCurrency(
  amount: number,
  fromCurrency: string | null | undefined,
  targetCurrency: string,
  rates: Map<string, number>,
  explicitRate?: number | null,
): string {
  const ccy = fromCurrency || targetCurrency;
  const primary = formatCurrency(amount, ccy);
  if (ccy === targetCurrency) return primary;
  const converted = convertAmount(amount, ccy, targetCurrency, rates, explicitRate);
  if (converted === null) return primary;
  return `${primary} (≈ ${formatCurrency(converted, targetCurrency)})`;
}
