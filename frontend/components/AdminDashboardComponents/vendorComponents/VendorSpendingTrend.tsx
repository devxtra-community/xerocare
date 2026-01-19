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
} from 'recharts';

const data = [
  { month: 'Jan', spend: 4000 },
  { month: 'Feb', spend: 3000 },
  { month: 'Mar', spend: 5000 },
  { month: 'Apr', spend: 4500 },
  { month: 'May', spend: 6000 },
  { month: 'Jun', spend: 5500 },
  { month: 'Jul', spend: 7000 },
];

export default function VendorSpendingTrend() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <div className="h-full w-full animate-pulse bg-gray-50 rounded-lg" />;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-row items-center justify-between pb-4">
        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
          Purchase Value Trend
        </p>
      </div>

      <div className="flex-1 w-full min-h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, left: -25, right: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="month"
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
                fontSize: '10px',
              }}
              cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="spend"
              stroke="#2563eb"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#spendGradient)"
              name="Spend"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
