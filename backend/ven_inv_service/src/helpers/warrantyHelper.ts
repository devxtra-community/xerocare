/**
 * Shared warranty evaluation logic.
 *
 * A machine's warranty can be limited by time, by copies produced, or both
 * (whichever expires first). This helper is the single source of truth used
 * by ticket context determination, machine context lookup, and the customer
 * history endpoint.
 */

export interface WarrantyEvaluationInput {
  /** 'none' | 'duration' | 'copies' | 'both' */
  warrantyType?: string | null;
  warrantyDurationValue?: number | null;
  /** 'months' | 'years' */
  warrantyDurationUnit?: string | null;
  warrantyCopyLimit?: number | null;
  /** Warranty start (invoice effectiveFrom, falling back to createdAt). */
  startDate: Date;
  /** Total copies produced so far (A3 counted as 2 A4 pages). */
  copiesUsed: number;
  /** Legacy fallback when no explicit duration: lease tenure or product warranty months. */
  fallbackMonths?: number;
  /** Legacy fallback when no explicit copy limit: maxCopyLimit or warranty_max_pages. */
  fallbackCopyLimit?: number;
}

export interface WarrantyEvaluation {
  isUnderWarranty: boolean;
  warrantyType: string;
  /** Date the time-based warranty ends; null when warranty has no time limit. */
  warrantyEndDate: Date | null;
  /** Copy limit in effect; null when warranty has no copy limit. */
  copyLimit: number | null;
  copiesUsed: number;
  /** Copies remaining before the copy limit expires the warranty; null when no copy limit. */
  copiesRemaining: number | null;
  /** What expired the warranty, when expired. */
  expiredBy: 'TIME' | 'COPIES' | 'BOTH' | null;
}

/**
 * Evaluates warranty status.
 *
 * Semantics (matching invoice warrantyType):
 * - 'both'     -> valid only while BOTH time and copies hold (whichever-first).
 * - 'duration' -> only the time limit matters.
 * - 'copies'   -> only the copy limit matters.
 * - 'none'     -> never under warranty.
 */
export function evaluateWarranty(input: WarrantyEvaluationInput): WarrantyEvaluation {
  const warrantyType = (input.warrantyType || 'duration').toLowerCase();
  const now = new Date();

  let warrantyEndDate: Date | null = null;
  let copyLimit: number | null = null;
  let durationValid = true;
  let copiesValid = true;

  if (warrantyType === 'duration' || warrantyType === 'both') {
    warrantyEndDate = new Date(input.startDate);
    if (input.warrantyDurationValue && input.warrantyDurationUnit) {
      if (input.warrantyDurationUnit === 'years') {
        warrantyEndDate.setFullYear(
          warrantyEndDate.getFullYear() + Number(input.warrantyDurationValue),
        );
      } else {
        warrantyEndDate.setMonth(warrantyEndDate.getMonth() + Number(input.warrantyDurationValue));
      }
    } else {
      warrantyEndDate.setMonth(warrantyEndDate.getMonth() + (input.fallbackMonths ?? 12));
    }
    durationValid = now <= warrantyEndDate;
  }

  if (warrantyType === 'copies' || warrantyType === 'both') {
    copyLimit = Number(input.warrantyCopyLimit) || input.fallbackCopyLimit || 200000;
    copiesValid = input.copiesUsed < copyLimit;
  }

  const isUnderWarranty = warrantyType !== 'none' && durationValid && copiesValid;

  let expiredBy: WarrantyEvaluation['expiredBy'] = null;
  if (!isUnderWarranty) {
    if (warrantyType === 'none') expiredBy = null;
    else if (!durationValid && !copiesValid) expiredBy = 'BOTH';
    else if (!durationValid) expiredBy = 'TIME';
    else if (!copiesValid) expiredBy = 'COPIES';
  }

  return {
    isUnderWarranty,
    warrantyType,
    warrantyEndDate,
    copyLimit,
    copiesUsed: input.copiesUsed,
    copiesRemaining: copyLimit !== null ? Math.max(0, copyLimit - input.copiesUsed) : null,
    expiredBy,
  };
}

/**
 * Computes total copies used from a product allocation's page counters,
 * counting A3 pages as 2 A4-equivalent pages. Falls back to the product's
 * meter reading when no allocation counters exist.
 */
export function copiesUsedFromCounters(
  allocation:
    | {
        currentBwA4?: number | null;
        currentBwA3?: number | null;
        currentColorA4?: number | null;
        currentColorA3?: number | null;
      }
    | null
    | undefined,
  productMeterReading?: number | null,
): number {
  if (allocation) {
    const total =
      (Number(allocation.currentBwA4) || 0) +
      (Number(allocation.currentBwA3) || 0) * 2 +
      (Number(allocation.currentColorA4) || 0) +
      (Number(allocation.currentColorA3) || 0) * 2;
    if (total > 0) return total;
  }
  return Number(productMeterReading) || 0;
}
