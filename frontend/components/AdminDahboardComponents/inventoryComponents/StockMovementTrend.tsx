'use client';
import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';

const data = [
  { month: 'Jan', stockIn: 400, stockOut: 240 },
  { month: 'Feb', stockIn: 300, stockOut: 139 },
  { month: 'Mar', stockIn: 200, stockOut: 980 },
  { month: 'Apr', stockIn: 278, stockOut: 390 },
  { month: 'May', stockIn: 189, stockOut: 480 },
  { month: 'Jun', stockIn: 239, stockOut: 380 },
  { month: 'Jul', stockIn: 349, stockOut: 430 },
];

/**
 * Area chart displaying detailed stock movement trends (Stock IN vs. Stock OUT).
 * Allows filtering by time periods (1M, 3M, 6M, 1Y) to analyze flow dynamics.
 * Essential for understanding inventory turnover and demand patterns.
 */
export default function StockMovementTrend() {
  const [selectedPeriod, setSelectedPeriod] = useState('1Y');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <div className="h-full w-full bg-muted/50 rounded-lg animate-pulse" />;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-row items-center justify-between pb-4">
        <p className="text-xs text-muted-foreground font-medium uppercase">Last 12 Months</p>
        <div className="flex gap-1.5 text-[10px]">
          {['1M', '3M', '6M', '1Y'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                selectedPeriod === period
                  ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                  : 'text-primary hover:bg-primary/10'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 w-full min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 5,
              right: 2,
              left: -25,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="colorStockIn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorStockOut" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-blue-light)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--chart-blue-light)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--chart-slate-dark)', fontSize: 10 }}
              dy={5}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--chart-slate-dark)', fontSize: 10 }}
            />
            <Tooltip
              content={<ChartTooltipContent />}
              cursor={{ stroke: 'var(--chart-grid)', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="stockIn"
              stroke="var(--primary)"
              fillOpacity={1}
              fill="url(#colorStockIn)"
              strokeWidth={2}
              name="Stock IN"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="stockOut"
              stroke="var(--chart-blue-light)"
              fillOpacity={1}
              fill="url(#colorStockOut)"
              strokeWidth={2}
              name="Stock OUT"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
