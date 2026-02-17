'use client';

import React from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, CartesianGrid } from 'recharts';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';

const cashFlowData = [
  { month: 'Jan', inflow: 42000, outflow: 31000 },
  { month: 'Feb', inflow: 38000, outflow: 29000 },
  { month: 'Mar', inflow: 46000, outflow: 34000 },
  { month: 'Apr', inflow: 41000, outflow: 38000 },
  { month: 'May', inflow: 52000, outflow: 31000 },
];

export default function CashFlowMiniChart() {
  // Calculate net for the latest month (May)
  const latest = cashFlowData[cashFlowData.length - 1];
  const netPosition = latest.inflow - latest.outflow;

  return (
    <div className="flex flex-col h-full">
      {/* Dynamic Header with Net Position */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Net Cash Position</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold text-foreground">
              AED {netPosition.toLocaleString()}
            </span>
            <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> +12%
            </span>
          </div>
        </div>
        <TrendingUp className="w-5 h-5 text-slate-300 mr-3" />
      </div>

      <div className="w-full h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={cashFlowData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorOutflow" x1="0" y1="0" x2="2" y2="1">
                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              dy={10}
            />

            <Tooltip
              content={
                <ChartTooltipContent
                  valueFormatter={(value) => {
                    const val = Number(value);
                    return `AED ${
                      val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toLocaleString()
                    }`;
                  }}
                />
              }
              cursor={{ stroke: '#2563eb', strokeWidth: 1, strokeDasharray: '4 4' }}
            />

            <Area
              type="monotone"
              dataKey="inflow"
              stroke="#2563eb"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorInflow)"
              name="Cash In"
            />
            <Area
              type="monotone"
              dataKey="outflow"
              stroke="#60a5fa"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorOutflow)"
              name="Cash Out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
