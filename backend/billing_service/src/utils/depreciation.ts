export function monthsBetween(from: Date, to: Date): number {
  const y = to.getFullYear() - from.getFullYear();
  const m = to.getMonth() - from.getMonth();
  return Math.max(0, y * 12 + m);
}

export interface DepreciationInput {
  purchasePrice: number;
  salvageValue: number;
  usefulLifeMonths: number;
  annualDepreciationPct: number;
  method: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';
  purchaseDate: Date;
  asOfDate?: Date;
}

export interface DepreciationResult {
  monthlyDep: number;
  accumulated: number;
  nbv: number;
  monthsElapsed: number;
}

export function calculateDepreciation(asset: DepreciationInput): DepreciationResult {
  const asOf = asset.asOfDate ?? new Date();
  const monthsElapsed = monthsBetween(asset.purchaseDate, asOf);
  const activeMonths = Math.min(monthsElapsed, asset.usefulLifeMonths);

  // A zero or missing useful life would divide by zero and hand back Infinity, which then
  // spreads silently into every total it touches.
  if (!Number.isFinite(asset.usefulLifeMonths) || asset.usefulLifeMonths <= 0) {
    return { monthlyDep: 0, accumulated: 0, nbv: asset.purchasePrice, monthsElapsed: 0 };
  }
  const depreciable = Math.max(0, asset.purchasePrice - asset.salvageValue);

  if (asset.method === 'STRAIGHT_LINE') {
    const accumulated = Math.min(
      (depreciable / asset.usefulLifeMonths) * activeMonths,
      depreciable,
    );
    const nbv = asset.purchasePrice - accumulated;
    // Once the asset is written down to salvage there is nothing left to charge. This
    // used to keep returning the full instalment for ever, and postDepreciationJournal
    // billed it month after month to assets that had finished depreciating years before.
    const monthlyDep =
      depreciable - accumulated <= 0.005
        ? 0
        : Math.min(depreciable / asset.usefulLifeMonths, depreciable - accumulated);
    return { monthlyDep, accumulated, nbv, monthsElapsed: activeMonths };
  }

  // DECLINING_BALANCE
  const monthlyRate = asset.annualDepreciationPct / 100 / 12;
  let nbv = asset.purchasePrice;
  let accumulated = 0;
  for (let i = 0; i < activeMonths; i++) {
    // Take whatever is left down to salvage rather than stopping short of it. Breaking
    // out here left NBV permanently above salvage and disagreed with
    // generateDepreciationSchedule, which clamps — so the Balance Sheet and the schedule
    // the user was shown reported different values for the same asset.
    const dep = Math.min(nbv * monthlyRate, nbv - asset.salvageValue);
    if (dep <= 0.005) break;
    accumulated += dep;
    nbv -= dep;
  }
  const monthlyDep = Math.max(0, Math.min(nbv * monthlyRate, nbv - asset.salvageValue));
  return { monthlyDep, accumulated, nbv, monthsElapsed: activeMonths };
}

export interface ScheduleRow {
  month: number;
  year: number;
  openingNBV: number;
  monthlyDep: number;
  accumulatedDep: number;
  closingNBV: number;
}

export function generateDepreciationSchedule(asset: DepreciationInput): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  const start = new Date(asset.purchaseDate);
  const monthlyRate = asset.annualDepreciationPct / 100 / 12;
  const slDep = (asset.purchasePrice - asset.salvageValue) / asset.usefulLifeMonths;

  let nbv = asset.purchasePrice;
  let accumulated = 0;

  for (let i = 0; i < asset.usefulLifeMonths; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const openingNBV = nbv;

    let dep: number;
    if (asset.method === 'STRAIGHT_LINE') {
      dep = slDep;
      if (accumulated + dep > asset.purchasePrice - asset.salvageValue) {
        dep = asset.purchasePrice - asset.salvageValue - accumulated;
      }
    } else {
      dep = nbv * monthlyRate;
      if (nbv - dep < asset.salvageValue) {
        dep = nbv - asset.salvageValue;
      }
    }

    if (dep <= 0) break;

    accumulated += dep;
    nbv -= dep;

    rows.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      openingNBV,
      monthlyDep: dep,
      accumulatedDep: accumulated,
      closingNBV: nbv,
    });
  }

  return rows;
}

/**
 * Depreciation charge for ONE specific accounting period.
 *
 * This is what a monthly close must use. `calculateDepreciation` above answers "how worn
 * is this asset right now" against today's date, which is a different question: it returns
 * a constant `monthlyDep` that keeps its value long after the asset is written down to
 * salvage, and it knows nothing about which period is being posted. Using it to post a
 * period charged a full month to assets that did not exist yet, and kept charging assets
 * that finished depreciating years ago.
 *
 * `accumulatedSoFar` is the total already POSTED against this asset, which is what makes
 * the result self-limiting: the charge can never take accumulated depreciation past the
 * depreciable base, whatever order periods are posted in.
 */
export function depreciationForPeriod(
  asset: Pick<
    DepreciationInput,
    'purchasePrice' | 'salvageValue' | 'usefulLifeMonths' | 'annualDepreciationPct' | 'method'
  > & { purchaseDate: Date },
  periodYear: number,
  periodMonth: number,
  accumulatedSoFar: number,
): number {
  const life = Number(asset.usefulLifeMonths);
  if (!Number.isFinite(life) || life <= 0) return 0;

  const p = new Date(asset.purchaseDate);
  // The purchase month is the asset's first depreciating month, matching
  // generateDepreciationSchedule, so a schedule row and a posted period agree.
  const monthIndex = (periodYear - p.getFullYear()) * 12 + (periodMonth - 1 - p.getMonth());

  // Not yet owned in this period, or already past the end of its useful life.
  if (monthIndex < 0 || monthIndex >= life) return 0;

  const depreciable = Number(asset.purchasePrice) - Number(asset.salvageValue);
  if (depreciable <= 0) return 0;

  const remaining = depreciable - Number(accumulatedSoFar || 0);
  if (remaining <= 0.005) return 0;

  let charge: number;
  if (asset.method === 'STRAIGHT_LINE') {
    charge = depreciable / life;
  } else {
    const nbv = Number(asset.purchasePrice) - Number(accumulatedSoFar || 0);
    charge = nbv * (Number(asset.annualDepreciationPct) / 100 / 12);
  }

  // Never write the asset below its salvage value — the last period takes whatever is
  // left rather than a full instalment.
  return Math.round(Math.min(charge, remaining) * 100) / 100;
}
