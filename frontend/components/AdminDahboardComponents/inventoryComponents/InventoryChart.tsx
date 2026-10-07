'use client';
import React, { useState, useEffect } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

const data = [
  { day: 'Mon', stockIn: 4000, stockOut: 2400 },
  { day: 'Tue', stockIn: 3000, stockOut: 1398 },
  { day: 'Wed', stockIn: 2000, stockOut: 9800 },
  { day: 'Thu', stockIn: 2780, stockOut: 3908 },
  { day: 'Fri', stockIn: 1890, stockOut: 4800 },
  { day: 'Sat', stockIn: 2390, stockOut: 3800 },
  { day: 'Sun', stockIn: 3490, stockOut: 4300 },
];

/**
 * Area chart displaying inventory stock movement (in/out) over time.
 * Visualizes the volume of stock additions vs. removals/sales.
 * Supports filtering by different time periods (Weekly, Monthly).
 */
export default function InventoryChart() {
  const [selectedPeriod, setSelectedPeriod] = useState('Weekly');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <div className="h-full w-full animate-pulse bg-muted/50 rounded-lg" />;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-row items-center justify-between pb-4">
        <p className="text-xs text-muted-foreground font-medium uppercase">Last 7 Days</p>

        <div className="flex gap-1.5 text-[10px] bg-primary/10 p-1 rounded-lg border border-primary/30">
          {['Weekly', 'Monthly'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1.5 rounded-md transition-all duration-200 ${
                selectedPeriod === period
                  ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                  : 'text-primary hover:text-primary'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, left: 0, right: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="stockInGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="stockOutGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-blue-light)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--chart-blue-light)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--chart-slate-dark)', fontSize: 10 }}
              tickMargin={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--chart-slate-dark)', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px color-mix(in srgb, var(--foreground) 10%, transparent)',
                padding: '8px',
                fontSize: '11px',
              }}
              cursor={{ stroke: 'var(--chart-grid)', strokeWidth: 1 }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: '10px', color: 'var(--chart-slate-dark)', top: -10 }}
            />
            <Area
              type="monotone"
              dataKey="stockIn"
              stroke="var(--primary)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#stockInGradient)"
              name="Stock In"
            />
            <Area
              type="monotone"
              dataKey="stockOut"
              stroke="var(--chart-blue-light)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#stockOutGradient)"
              name="Stock Out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
