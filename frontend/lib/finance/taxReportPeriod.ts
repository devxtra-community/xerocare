/**
 * Period preset for the Tax Report tabs — mirrors the Period pattern already used on
 * income-statement and cash-flow (This Month / Last Month / This Quarter / This Year /
 * Last Year / Custom), so Finance sees one consistent period idiom across Accounts.
 */
export type TaxPeriod =
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'last_year'
  | 'custom';

export const TAX_PERIOD_LABELS: Record<TaxPeriod, string> = {
  this_month: 'This Month',
  last_month: 'Last Month',
  this_quarter: 'This Quarter',
  this_year: 'This Year',
  last_year: 'Last Year',
  custom: 'Custom',
};

function localDate(y: number, m: number, d: number): string {
  // Resolve through a real Date so overflow values (month 12, day 0 = last day
  // of previous month) normalize to an actual calendar date instead of being
  // stringified literally (e.g. "2026-08-00", which the backend rejects).
  const dt = new Date(y, m, d);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/**
 * Resolves a period preset to a concrete { from, to } date range using local
 * calendar math (not toISOString, which shifts dates across UTC timezone
 * boundaries) so the range lands on the correct day regardless of branch timezone.
 */
export function getTaxPeriodRange(
  period: TaxPeriod,
  customFrom: string,
  customTo: string,
): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (period === 'custom') return { from: customFrom, to: customTo };
  if (period === 'this_month') {
    return { from: localDate(y, m, 1), to: localDate(y, m + 1, 0) };
  }
  if (period === 'last_month') {
    return { from: localDate(y, m - 1, 1), to: localDate(y, m, 0) };
  }
  if (period === 'this_quarter') {
    const q = Math.floor(m / 3);
    return { from: localDate(y, q * 3, 1), to: localDate(y, q * 3 + 3, 0) };
  }
  if (period === 'last_year') {
    return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
  }
  // this_year
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}
