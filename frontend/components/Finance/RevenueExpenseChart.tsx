'use client';

import React from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';
import { formatCompactNumber } from '@/lib/format';

import { getActiveCurrency } from '@/lib/currency';
const data = [
  { month: 'Jan', revenue: 120000, expense: 85000 },
  { month: 'Feb', revenue: 98000, expense: 72000 },
  { month: 'Mar', revenue: 135000, expense: 90000 },
  { month: 'Apr', revenue: 110000, expense: 95000 },
  { month: 'May', revenue: 145000, expense: 88000 },
];

export default function RevenueExpenseChart() {
  return (
    <div className="w-full h-[310px] mt-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={8}>
          {/* Subtle Grid Lines - only horizontal to reduce clutter */}
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--muted)" />

          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--chart-slate-dark)', fontSize: 12 }}
            dy={10}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--chart-slate-dark)', fontSize: 12 }}
            tickFormatter={(value) => `${formatCompactNumber(value)}`}
          />

          <Tooltip
            content={
              <ChartTooltipContent
                valueFormatter={(val) =>
                  `${getActiveCurrency()} ${formatCompactNumber(Number(val))}`
                }
                footer={(payload) => {
                  const net = (Number(payload[0]?.value) || 0) - (Number(payload[1]?.value) || 0);
                  return (
                    <div className="flex justify-between gap-4 pt-1 mt-1 border-t border-primary/30">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tighter">
                        Net:
                      </span>
                      <span
                        className={`text-[11px] font-bold ${
                          net >= 0 ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {`${getActiveCurrency()} ${formatCompactNumber(net)}`}
                      </span>
                    </div>
                  );
                }}
              />
            }
            cursor={{ fill: 'var(--muted)' }}
          />

          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 500 }}
          />

          {/* Revenue Bar with Rounded Corners */}
          <Bar
            name="Revenue"
            dataKey="revenue"
            fill="var(--chart-blue-mid)"
            radius={[4, 4, 0, 0]}
            barSize={32}
          />

          {/* Expense Bar with Rounded Corners */}
          <Bar
            name="Expenses"
            dataKey="expense"
            fill="var(--chart-slate)" // Neutral slate for expense to focus on revenue
            radius={[4, 4, 0, 0]}
            barSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
