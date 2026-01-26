'use client';
import { useState, useEffect } from 'react';
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
  { month: 'Jan', sales: 30000 },
  { month: 'Feb', sales: 45000 },
  { month: 'Mar', sales: 70000 },
  { month: 'Apr', sales: 55000 },
  { month: 'May', sales: 25000 },
  { month: 'Jun', sales: 50000 },
  { month: 'Jul', sales: 60000 },
  { month: 'Aug', sales: 40000 },
  { month: 'Sep', sales: 65000 },
  { month: 'Oct', sales: 80000 },
  { month: 'Nov', sales: 55000 },
  { month: 'Dec', sales: 90000 },
];

export default function SalesChart() {
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="rounded-2xl bg-white h-[260px] w-full shadow-sm flex flex-col p-3">
      <div className="flex flex-row items-center justify-between pb-2">
        <p className="text-xs text-gray-600">Monthly</p>

        <div className="flex gap-1.5 text-[10px]">
          {['1W', '1M', '3M', '1Y'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                selectedPeriod === period
                  ? 'bg-primary text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, left: 0, right: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.3} />

              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tickMargin={6}
                tick={{ fill: '#6b7280', fontSize: 10 }}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v / 1000}k`}
                tickMargin={6}
                domain={[0, 100000]}
                ticks={[0, 20000, 40000, 60000, 80000, 100000]}
                tick={{ fill: '#6b7280', fontSize: 10 }}
              />

              <Tooltip contentStyle={{ fontSize: 12 }} labelStyle={{ color: '#1e3a8a' }} />

              <Area
                type="monotone"
                dataKey="sales"
                stroke="#1d4ed8"
                strokeWidth={2}
                fill="url(#salesGradient)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
