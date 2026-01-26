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

const data = [
  { month: 'Jan', stockIn: 400, stockOut: 240 },
  { month: 'Feb', stockIn: 300, stockOut: 139 },
  { month: 'Mar', stockIn: 200, stockOut: 980 },
  { month: 'Apr', stockIn: 278, stockOut: 390 },
  { month: 'May', stockIn: 189, stockOut: 480 },
  { month: 'Jun', stockIn: 239, stockOut: 380 },
  { month: 'Jul', stockIn: 349, stockOut: 430 },
];

export default function StockMovementTrend() {
  const [selectedPeriod, setSelectedPeriod] = useState('1Y');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <div className="h-full w-full bg-gray-50 rounded-lg animate-pulse" />;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-row items-center justify-between pb-4">
        <p className="text-xs text-gray-500 font-medium uppercase">Last 12 Months</p>
        <div className="flex gap-1.5 text-[10px]">
          {['1M', '3M', '6M', '1Y'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                selectedPeriod === period
                  ? 'bg-primary text-white font-medium shadow-sm'
                  : 'text-blue-600 hover:bg-blue-50'
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
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorStockOut" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#93c5fd" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 10 }}
              dy={5}
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
            <Area
              type="monotone"
              dataKey="stockIn"
              stroke="#2563eb"
              fillOpacity={1}
              fill="url(#colorStockIn)"
              strokeWidth={2}
              name="Stock IN"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="stockOut"
              stroke="#93c5fd"
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
