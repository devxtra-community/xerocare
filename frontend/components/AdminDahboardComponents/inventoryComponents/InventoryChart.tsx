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

        <div className="flex gap-1.5 text-[10px] bg-blue-50/50 p-1 rounded-lg border border-blue-100/50">
          {['Weekly', 'Monthly'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1.5 rounded-md transition-all duration-200 ${
                selectedPeriod === period
                  ? 'bg-primary text-white font-medium shadow-sm'
                  : 'text-blue-600 hover:text-blue-800'
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
                <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#93c5fd" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 10 }}
              tickMargin={10}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                padding: '8px',
                fontSize: '11px',
              }}
              cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: '10px', color: '#64748B', top: -10 }}
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
              stroke="#93c5fd"
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
