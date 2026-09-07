/**
 * Decimal-safe money arithmetic in integer minor units.
 *
 * Percentage-of-amount plus a fixed fee, then capped — done in floats that is exactly
 * the shape that accumulates error (0.1 + 0.2 !== 0.3), and a processing fee that is a
 * fraction of a fils off makes gross − fee = net stop reconciling. Everything here
 * converts to whole minor units first, does integer arithmetic, and converts back once.
 *
 * No new dependency: the repo already rounds money as Math.round(n * 100) / 100, and
 * this is the same idea done properly, including for the three-decimal Gulf currencies.
 */

/**
 * Minor-unit exponent per currency.
 *
 * The Gulf is NOT uniformly two-decimal: the Kuwaiti dinar, Omani rial and Bahraini
 * dinar are divided into 1000 fils, so a 2-decimal assumption silently truncates a
 * digit of real money on every KWD/OMR/BHD transaction.
 */
const CURRENCY_EXPONENT: Record<string, number> = {
  AED: 2,
  SAR: 2,
  QAR: 2,
  KWD: 3,
  OMR: 3,
  BHD: 3,
  USD: 2,
  EUR: 2,
  INR: 2,
};

export function currencyExponent(currency?: string | null): number {
  return CURRENCY_EXPONENT[(currency || 'AED').trim().toUpperCase()] ?? 2;
}

/** Major units (2000.50) -> minor units (200050). Rounds half-away-from-zero. */
export function toMinor(amount: number | string, currency?: string | null): number {
  const exp = currencyExponent(currency);
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  const scaled = n * 10 ** exp;
  // Nudge before rounding: 2.675 * 100 is 267.49999999999997 in binary floating point,
  // which would round down to 2.67 and lose a fils that the customer actually paid.
  return Math.round(Number(scaled.toFixed(6)));
}

/** Minor units (200050) -> major units (2000.50). */
export function fromMinor(minor: number, currency?: string | null): number {
  const exp = currencyExponent(currency);
  return Number((minor / 10 ** exp).toFixed(exp));
}

/**
 * percent of an amount, in minor units, rounded half-up.
 * Kept integer end-to-end: (minor * bps) / 10000 where bps is the rate in basis points.
 */
export function percentOfMinor(amountMinor: number, ratePercent: number): number {
  // Percent -> basis points as an integer, so a rate like 2.9 does not re-introduce a
  // binary fraction. Four decimal places of a percent is finer than any published MDR.
  const bps = Math.round(Number(ratePercent) * 10000);
  return Math.round((amountMinor * bps) / 1000000);
}

/** Formats for display/logging without floating-point surprises. */
export function formatMoney(amount: number, currency?: string | null): string {
  return Number(amount).toFixed(currencyExponent(currency));
}
