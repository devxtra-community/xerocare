import { EntityManager } from 'typeorm';
import { logger } from '../config/logger';

export const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface ExchangeRateResult {
  rate: number;
  fetchedAt: Date;
}

/**
 * Rate to convert `fromCurrency` into `toCurrency`.
 * Uses the cron-maintained exchange_rates table; falls back to a live fetch
 * (and caches it back) when the pair is missing or older than 48h.
 * Same-currency (or missing codes) resolves to 1.
 */
export async function getExchangeRate(
  manager: EntityManager,
  fromCurrency?: string | null,
  toCurrency?: string | null,
): Promise<ExchangeRateResult> {
  if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) {
    return { rate: 1, fetchedAt: new Date() };
  }

  const rows = (await manager.query(
    `SELECT rate, fetched_at FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2`,
    [fromCurrency, toCurrency],
  )) as { rate: string; fetched_at: string }[];
  const cached = rows[0];
  const fresh = cached && Date.now() - new Date(cached.fetched_at).getTime() < 48 * 60 * 60 * 1000;
  if (cached && fresh) {
    return { rate: Number(cached.rate), fetchedAt: new Date(cached.fetched_at) };
  }

  try {
    const resp = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
    if (resp.ok) {
      const data = (await resp.json()) as { rates?: Record<string, number> };
      const live = data.rates?.[toCurrency];
      if (live && live > 0) {
        await manager.query(
          `INSERT INTO exchange_rates (from_currency, to_currency, rate, fetched_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (from_currency, to_currency) DO UPDATE
             SET rate = EXCLUDED.rate, fetched_at = EXCLUDED.fetched_at`,
          [fromCurrency, toCurrency, live],
        );
        return { rate: live, fetchedAt: new Date() };
      }
    }
  } catch (err) {
    logger.warn(`Live exchange rate fetch ${fromCurrency}->${toCurrency} failed:`, err);
  }

  if (cached) {
    // stale beats nothing
    return { rate: Number(cached.rate), fetchedAt: new Date(cached.fetched_at) };
  }
  throw new Error(
    `Exchange rate ${fromCurrency} → ${toCurrency} is unavailable. Try again shortly.`,
  );
}
