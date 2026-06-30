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

  if (asset.method === 'STRAIGHT_LINE') {
    const monthlyDep = (asset.purchasePrice - asset.salvageValue) / asset.usefulLifeMonths;
    const accumulated = Math.min(
      monthlyDep * activeMonths,
      asset.purchasePrice - asset.salvageValue,
    );
    const nbv = asset.purchasePrice - accumulated;
    return { monthlyDep, accumulated, nbv, monthsElapsed: activeMonths };
  }

  // DECLINING_BALANCE
  const monthlyRate = asset.annualDepreciationPct / 100 / 12;
  let nbv = asset.purchasePrice;
  let accumulated = 0;
  for (let i = 0; i < activeMonths; i++) {
    const dep = nbv * monthlyRate;
    if (nbv - dep < asset.salvageValue) break;
    accumulated += dep;
    nbv -= dep;
  }
  const monthlyDep = nbv * monthlyRate;
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
