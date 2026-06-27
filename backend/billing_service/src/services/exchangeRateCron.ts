import cron from 'node-cron';
import { Client } from 'pg';
import { logger } from '../config/logger';

const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

interface ExchangeApiResponse {
  base: string;
  rates: Record<string, number>;
}

async function fetchActiveBranchCurrencies(): Promise<string[]> {
  const client = new Client({
    connectionString: process.env.VENDOR_DATABASE_URL,
    ssl: process.env.VENDOR_DATABASE_URL?.includes('neon.tech')
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    await client.connect();
    const result = await client.query<{ currency_code: string }>(
      `SELECT DISTINCT currency_code FROM branches WHERE status = 'ACTIVE' AND currency_code IS NOT NULL`,
    );
    return result.rows.map((r) => r.currency_code);
  } finally {
    await client.end();
  }
}

async function upsertExchangeRates(
  pairs: Array<{ fromCurrency: string; toCurrency: string; rate: number }>,
): Promise<void> {
  const client = new Client({
    connectionString: process.env.VENDOR_DATABASE_URL,
    ssl: process.env.VENDOR_DATABASE_URL?.includes('neon.tech')
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    await client.connect();
    for (const pair of pairs) {
      await client.query(
        `INSERT INTO exchange_rates (from_currency, to_currency, rate, fetched_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (from_currency, to_currency) DO UPDATE
           SET rate = EXCLUDED.rate, fetched_at = EXCLUDED.fetched_at`,
        [pair.fromCurrency, pair.toCurrency, pair.rate],
      );
    }
  } finally {
    await client.end();
  }
}

export async function runExchangeRateCron(): Promise<void> {
  logger.info('[EXCHANGE_RATE_CRON] Starting exchange rate fetch...');

  try {
    const currencies = await fetchActiveBranchCurrencies();

    if (currencies.length === 0) {
      logger.info('[EXCHANGE_RATE_CRON] No active branches with currency codes — skipping.');
      return;
    }

    logger.info(`[EXCHANGE_RATE_CRON] Fetching rates for currencies: ${currencies.join(', ')}`);

    const response = await fetch(EXCHANGE_API_URL);
    if (!response.ok) {
      throw new Error(`Exchange rate API returned ${response.status}`);
    }

    const data = (await response.json()) as ExchangeApiResponse;
    const usdRates = data.rates;

    // Build all cross-rate pairs between branch currencies
    const pairs: Array<{ fromCurrency: string; toCurrency: string; rate: number }> = [];

    for (const from of currencies) {
      for (const to of currencies) {
        if (from === to) continue;

        const fromRate = usdRates[from];
        const toRate = usdRates[to];

        if (!fromRate || !toRate) {
          logger.warn(`[EXCHANGE_RATE_CRON] Missing rate for ${from} or ${to} — skipping pair.`);
          continue;
        }

        // cross-rate: 1 from = (toRate / fromRate) to
        const rate = toRate / fromRate;
        pairs.push({ fromCurrency: from, toCurrency: to, rate });
      }

      // Also store from→USD and USD→from for vendor quotes in USD
      const fromRate = usdRates[from];
      if (fromRate) {
        pairs.push({ fromCurrency: 'USD', toCurrency: from, rate: fromRate });
        pairs.push({ fromCurrency: from, toCurrency: 'USD', rate: 1 / fromRate });
      }
    }

    await upsertExchangeRates(pairs);

    logger.info(`[EXCHANGE_RATE_CRON] Successfully upserted ${pairs.length} exchange rate pairs.`);
  } catch (err) {
    logger.error('[EXCHANGE_RATE_CRON] Failed to update exchange rates:', err);
  }
}

export function startExchangeRateCron(): void {
  if (!process.env.VENDOR_DATABASE_URL) {
    logger.warn('[EXCHANGE_RATE_CRON] VENDOR_DATABASE_URL not set — exchange rate cron disabled.');
    return;
  }

  // Daily at midnight server time
  cron.schedule('0 0 * * *', () => {
    runExchangeRateCron();
  });

  logger.info('[EXCHANGE_RATE_CRON] Exchange rate cron scheduled (daily at midnight).');

  // Run once on startup to ensure rates are populated
  runExchangeRateCron();
}
