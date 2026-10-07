'use client';

interface DepreciationPreviewProps {
  purchasePrice: number;
  salvagePct: number;
  usefulLifeMonths: number;
  annualDepreciationPct: number;
  method: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';
  currency: string;
}

export function DepreciationPreview({
  purchasePrice,
  salvagePct,
  usefulLifeMonths,
  annualDepreciationPct,
  method,
  currency,
}: DepreciationPreviewProps) {
  const salvageValue = purchasePrice * (salvagePct / 100);
  const depreciableAmount = purchasePrice - salvageValue;

  const monthlyDepSL = depreciableAmount / Math.max(usefulLifeMonths, 1);
  const monthlyDepDB = purchasePrice * (annualDepreciationPct / 100 / 12);
  const monthlyDep = method === 'STRAIGHT_LINE' ? monthlyDepSL : monthlyDepDB;

  const fmt = (n: number) =>
    `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // First 12 months schedule
  const schedule: { month: number; openingNBV: number; dep: number; closingNBV: number }[] = [];
  let nbv = purchasePrice;
  for (let i = 1; i <= Math.min(usefulLifeMonths, 36); i++) {
    let dep: number;
    if (method === 'STRAIGHT_LINE') {
      dep = monthlyDepSL;
    } else {
      dep = nbv * (annualDepreciationPct / 100 / 12);
    }
    const closing = Math.max(nbv - dep, salvageValue);
    dep = nbv - closing;
    schedule.push({ month: i, openingNBV: nbv, dep, closingNBV: closing });
    nbv = closing;
    if (closing <= salvageValue + 0.001) break;
  }

  return (
    <div className="bg-card border rounded-lg p-3 space-y-3">
      <p className="text-sm font-semibold text-foreground">Depreciation Preview</p>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-muted rounded p-2">
          <div className="text-xs text-muted-foreground">Purchase Price</div>
          <div className="font-semibold">{fmt(purchasePrice)}</div>
        </div>
        <div className="bg-muted rounded p-2">
          <div className="text-xs text-muted-foreground">Salvage Value</div>
          <div className="font-semibold">{fmt(salvageValue)}</div>
        </div>
        <div className="bg-primary/10 rounded p-2">
          <div className="text-xs text-primary">Monthly Depreciation</div>
          <div className="font-semibold text-primary">{fmt(monthlyDep)}</div>
        </div>
        <div className="bg-primary/10 rounded p-2">
          <div className="text-xs text-primary">Annual Depreciation</div>
          <div className="font-semibold text-primary">{fmt(monthlyDep * 12)}</div>
        </div>
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer text-primary hover:underline">
          View first {Math.min(schedule.length, 12)} months schedule
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="p-1 text-left border">Month</th>
                <th className="p-1 text-right border">Opening NBV</th>
                <th className="p-1 text-right border">Depreciation</th>
                <th className="p-1 text-right border">Closing NBV</th>
              </tr>
            </thead>
            <tbody>
              {schedule.slice(0, 12).map((row) => (
                <tr key={row.month} className="hover:bg-muted">
                  <td className="p-1 border">Month {row.month}</td>
                  <td className="p-1 text-right border">{fmt(row.openingNBV)}</td>
                  <td className="p-1 text-right border text-destructive">({fmt(row.dep)})</td>
                  <td className="p-1 text-right border font-medium">{fmt(row.closingNBV)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
