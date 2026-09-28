import { EntityManager, IsNull } from 'typeorm';
import { Source } from '../config/db';
import { Product } from '../entities/productEntity';
import { logger } from '../config/logger';

/**
 * One meter reading per machine, shared by every side of the system.
 *
 * `products.meter_reading` is the machine's current reading. It used to be written only by
 * the service side (tickets, service contracts), while every Rent/Lease reading —
 * installation, monthly usage, machine replacement — stayed on billing_service's
 * allocation rows. So a rented machine read 0 in the service ticket's machine picker no
 * matter how many readings Finance had taken. Every flow now reports here, and
 * `product_meter_readings` keeps which flow took each reading and when.
 *
 * Rent/Lease counters convert to one total the same way the rest of the system already
 * does (copiesUsedFromCounters): an A3 page counts as two.
 */

export type MeterReadingSource =
  | 'SERVICE_TICKET'
  | 'SERVICE_DIAGNOSIS'
  | 'SERVICE_COMPLETION'
  | 'SERVICE_CONTRACT'
  | 'EXTERNAL_REGISTRATION'
  | 'CONTRACT_START'
  | 'INSTALLATION'
  | 'RENT_USAGE'
  | 'LEASE_USAGE'
  | 'REPLACEMENT_REMOVED'
  | 'REPLACEMENT_INSTALLED'
  | 'CONTRACT_SYNC';

export const METER_READING_SOURCES: MeterReadingSource[] = [
  'SERVICE_TICKET',
  'SERVICE_DIAGNOSIS',
  'SERVICE_COMPLETION',
  'SERVICE_CONTRACT',
  'EXTERNAL_REGISTRATION',
  'CONTRACT_START',
  'INSTALLATION',
  'RENT_USAGE',
  'LEASE_USAGE',
  'REPLACEMENT_REMOVED',
  'REPLACEMENT_INSTALLED',
  'CONTRACT_SYNC',
];

export interface MeterCounters {
  bwA4?: number | null;
  bwA3?: number | null;
  colorA4?: number | null;
  colorA3?: number | null;
}

export function totalFromCounters(c: MeterCounters): number {
  return (
    (Number(c.bwA4) || 0) +
    (Number(c.bwA3) || 0) * 2 +
    (Number(c.colorA4) || 0) +
    (Number(c.colorA3) || 0) * 2
  );
}

export interface RecordMeterReadingInput {
  /** The product row when the caller already has it (it is updated in place). */
  product?: Product | null;
  productId?: string | null;
  serialNo?: string | null;
  /** Single total counter. Derived from `counters` when omitted. */
  total?: number | null;
  counters?: MeterCounters;
  source: MeterReadingSource;
  referenceId?: string | null;
  referenceNo?: string | null;
  readingDate?: Date | string | null;
  recordedBy?: string | null;
  /**
   * Only raise the product's reading, never lower it (default true). The service forms
   * validate a new reading against the current one, so a lower value arriving from
   * another flow — an out-of-order sync, a catch-up — must not reset that floor.
   * Service-side callers that already validated the value pass false.
   */
  monotonic?: boolean;
  /** Skip the log row when nothing changed (used by the idempotent catch-up sync). */
  logOnlyIfApplied?: boolean;
}

/**
 * Records a reading: updates the product's current meter (when it moves forward) and logs
 * it with its source. Returns whether the product's reading changed.
 */
export async function recordMeterReading(
  input: RecordMeterReadingInput,
  manager: EntityManager = Source.manager,
): Promise<{ applied: boolean; total: number; productId: string | null }> {
  const total =
    input.total != null && !Number.isNaN(Number(input.total))
      ? Math.max(0, Math.round(Number(input.total)))
      : totalFromCounters(input.counters ?? {});

  const repo = manager.getRepository(Product);
  let product = input.product ?? null;
  if (!product && input.productId) {
    product = await repo.findOne({ where: { id: input.productId } });
  }
  if (!product && input.serialNo) {
    product = await repo.findOne({
      where: { serial_no: input.serialNo, deleted_at: IsNull() },
    });
  }

  const serialNo = product?.serial_no ?? input.serialNo ?? null;
  if (!serialNo) {
    logger.warn('[meterReading] Skipped: no product or serial to attach the reading to', {
      source: input.source,
      referenceId: input.referenceId,
    });
    return { applied: false, total, productId: null };
  }

  const readingDate = input.readingDate ? new Date(input.readingDate) : new Date();
  const current = Number(product?.meter_reading) || 0;
  const monotonic = input.monotonic !== false;
  let applied = false;
  if (product) {
    // Equal counts as moving forward only when the product has no dated reading yet, so a
    // legacy value gains its source/date without every repeat sync re-stamping it.
    const movesForward =
      !monotonic || total > current || (total === current && !product.meter_reading_at);
    if (movesForward) {
      product.meter_reading = total;
      product.meter_reading_at = readingDate;
      product.meter_reading_source = input.source;
      await repo.save(product);
      applied = true;
    }
  }

  if (!input.logOnlyIfApplied || applied) {
    await manager.query(
      `INSERT INTO product_meter_readings
         (product_id, serial_no, total_reading, bw_a4, bw_a3, color_a4, color_a3,
          source, reference_id, reference_no, reading_date, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        product?.id ?? null,
        serialNo,
        total,
        input.counters?.bwA4 ?? null,
        input.counters?.bwA3 ?? null,
        input.counters?.colorA4 ?? null,
        input.counters?.colorA3 ?? null,
        input.source,
        input.referenceId ?? null,
        input.referenceNo ?? null,
        readingDate,
        input.recordedBy ?? null,
      ],
    );
  }

  return { applied, total, productId: product?.id ?? null };
}

/** Recent readings for one machine, newest first. */
export async function getMeterReadingHistory(productIdOrSerial: string, limit = 50) {
  return Source.query(
    `SELECT r.id, r.product_id AS "productId", r.serial_no AS "serialNo",
            r.total_reading AS "totalReading", r.bw_a4 AS "bwA4", r.bw_a3 AS "bwA3",
            r.color_a4 AS "colorA4", r.color_a3 AS "colorA3", r.source,
            r.reference_id AS "referenceId", r.reference_no AS "referenceNo",
            r.reading_date AS "readingDate", r.recorded_by AS "recordedBy",
            r.created_at AS "createdAt"
       FROM product_meter_readings r
      WHERE r.product_id::text = $1 OR r.serial_no = $1
      ORDER BY r.reading_date DESC, r.created_at DESC
      LIMIT $2`,
    [productIdOrSerial, limit],
  );
}
