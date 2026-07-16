'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TAX_PERIOD_LABELS, type TaxPeriod } from '@/lib/finance/taxReportPeriod';

/** Period preset dropdown — same idiom as income-statement / cash-flow — plus a Custom date-range fallback. */
export function TaxPeriodFilter({
  period,
  onPeriodChange,
  customFrom,
  customTo,
  onCustomChange,
}: {
  period: TaxPeriod;
  onPeriodChange: (p: TaxPeriod) => void;
  customFrom: string;
  customTo: string;
  onCustomChange: (delta: { customFrom?: string; customTo?: string }) => void;
}) {
  return (
    <>
      <Select value={period} onValueChange={(v) => onPeriodChange(v as TaxPeriod)}>
        <SelectTrigger className="w-40 h-10 bg-white shadow-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(TAX_PERIOD_LABELS) as [TaxPeriod, string][]).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {period === 'custom' && (
        <>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomChange({ customFrom: e.target.value })}
            className="rounded-lg border px-3 py-2 text-sm bg-white shadow-sm h-10"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => onCustomChange({ customTo: e.target.value })}
            className="rounded-lg border px-3 py-2 text-sm bg-white shadow-sm h-10"
          />
        </>
      )}
    </>
  );
}
