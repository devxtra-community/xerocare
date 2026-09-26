import { sign } from 'jsonwebtoken';
import { logger } from '../config/logger';

/**
 * Pushes Rent/Lease meter readings to the machine's shared reading in ven_inv.
 *
 * Every Rent/Lease reading — contract start, installation, monthly usage, replacement —
 * used to stay on this service's allocation rows only, so the product's reading (the one
 * the service ticket form shows and validates against) never moved for a rented machine.
 * ven_inv records each reading with its source and only ever raises the product's value,
 * so a repeated or late push is harmless.
 *
 * Best-effort and never throws: callers run this after their own reading is committed,
 * and a failed mirror must not undo or fail a usage record, installation or replacement.
 */

export type MeterReadingPushSource =
  | 'CONTRACT_START'
  | 'INSTALLATION'
  | 'RENT_USAGE'
  | 'LEASE_USAGE'
  | 'REPLACEMENT_REMOVED'
  | 'REPLACEMENT_INSTALLED'
  | 'CONTRACT_SYNC';

export interface MeterReadingPush {
  productId?: string | null;
  serialNo?: string | null;
  counters: {
    bwA4?: number | null;
    bwA3?: number | null;
    colorA4?: number | null;
    colorA3?: number | null;
  };
  source: MeterReadingPushSource;
  referenceId?: string | null;
  referenceNo?: string | null;
  readingDate?: Date | string | null;
  recordedBy?: string | null;
  /** Idempotent catch-up: don't log a row when the product's reading didn't change. */
  logOnlyIfApplied?: boolean;
}

export async function pushMeterReadings(readings: MeterReadingPush[]): Promise<void> {
  const usable = readings.filter((r) => r.productId || r.serialNo);
  if (usable.length === 0) return;
  try {
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '2m' },
    );
    const base =
      process.env.VEN_INV_SERVICE_URL ||
      process.env.INVENTORY_SERVICE_URL ||
      'http://localhost:3003';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${base}/products/internal/meter-readings`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-internal-service': 'billing',
      },
      body: JSON.stringify({ readings: usable }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      logger.warn('[meterReadingSync] ven_inv rejected the meter readings', {
        status: res.status,
        body: await res.text().catch(() => ''),
        count: usable.length,
      });
    }
  } catch (err) {
    logger.warn('[meterReadingSync] Could not deliver meter readings to ven_inv', {
      err: err instanceof Error ? err.message : String(err),
      count: usable.length,
    });
  }
}

/**
 * One-time catch-up for machines read before readings were shared: pushes every machine
 * currently on a Rent/Lease contract with its latest counters. Idempotent — ven_inv only
 * raises a reading and logs nothing when it didn't change — so running on every start is
 * harmless. Delayed so ven_inv has time to come up, and never blocks or fails startup.
 */
export function scheduleAllocatedMeterReadingCatchUp(delayMs = 45_000): void {
  setTimeout(async () => {
    try {
      const { Source } = await import('../config/dataSource');
      const rows: Array<{
        productId: string | null;
        serialNumber: string | null;
        bwA4: number;
        bwA3: number;
        colorA4: number;
        colorA3: number;
        contractId: string;
        invoiceNumber: string | null;
        saleType: string | null;
      }> = await Source.query(
        `SELECT a."productId", a."serialNumber",
                a."currentBwA4" AS "bwA4", a."currentBwA3" AS "bwA3",
                a."currentColorA4" AS "colorA4", a."currentColorA3" AS "colorA3",
                a."contractId", i."invoiceNumber", i."saleType"::text AS "saleType"
           FROM product_allocations a
           JOIN invoices i ON i.id = a."contractId"
          WHERE a.status = 'ALLOCATED'
            AND (COALESCE(a."currentBwA4",0) + COALESCE(a."currentBwA3",0)
               + COALESCE(a."currentColorA4",0) + COALESCE(a."currentColorA3",0)) > 0`,
      );
      const pushes: MeterReadingPush[] = rows.map((r) => ({
        productId: r.productId,
        serialNo: r.serialNumber,
        counters: { bwA4: r.bwA4, bwA3: r.bwA3, colorA4: r.colorA4, colorA3: r.colorA3 },
        source: 'CONTRACT_SYNC',
        referenceId: r.contractId,
        referenceNo: r.invoiceNumber,
        logOnlyIfApplied: true,
      }));
      for (let i = 0; i < pushes.length; i += 100) {
        await pushMeterReadings(pushes.slice(i, i + 100));
      }
      if (pushes.length > 0) {
        logger.info('[meterReadingSync] Catch-up pushed allocated machine readings', {
          count: pushes.length,
        });
      }
    } catch (err) {
      logger.warn('[meterReadingSync] Catch-up skipped', {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }, delayMs);
}
