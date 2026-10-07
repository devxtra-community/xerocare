'use client';

import React from 'react';
import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface ChartTooltipProps extends TooltipProps<ValueType, NameType> {
  valueFormatter?: (value: ValueType) => string;
  labelFormatter?: (
    label: string,
    payload?: TooltipProps<ValueType, NameType>['payload'],
  ) => string;
  showTotal?: boolean;
  footer?:
    | React.ReactNode
    | ((payload: NonNullable<TooltipProps<ValueType, NameType>['payload']>) => React.ReactNode);
}

export const ChartTooltipContent = ({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
  showTotal,
  footer,
}: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);

    return (
      <div className="bg-card p-3 rounded-lg shadow-md border border-border min-w-[150px]">
        <p className="font-semibold text-primary text-[10px] mb-2 uppercase tracking-wider border-b border-border pb-1">
          {labelFormatter ? labelFormatter(String(label), payload) : label}
        </p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex justify-between items-center gap-4">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {entry.name}:
              </span>
              <span className="text-[var(--primary)] font-bold text-[11px]">
                {valueFormatter && entry.value !== undefined
                  ? valueFormatter(entry.value)
                  : entry.value}
              </span>
            </div>
          ))}
          {showTotal && (
            <div className="flex justify-between items-center gap-4 border-t border-border mt-1 pt-1">
              <span className="text-[11px] font-bold text-primary uppercase tracking-tighter">
                Total:
              </span>
              <span className="text-primary font-bold text-[11px]">
                {valueFormatter ? valueFormatter(total) : total}
              </span>
            </div>
          )}
          {footer && (
            <div className="mt-2">{typeof footer === 'function' ? footer(payload) : footer}</div>
          )}
        </div>
      </div>
    );
  }
  return null;
};
