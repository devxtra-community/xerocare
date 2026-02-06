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

import { salesService } from '@/services/salesService';

// Remove hardcoded data

export default function BranchSalesChart() {
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const [isClient, setIsClient] = useState(false);
  const [chartData, setChartData] = useState<{ date: string; sales: number }[]>([]);

  useEffect(() => {
    setIsClient(true);

    const fetchData = async () => {
      try {
        const sales = await salesService.getBranchSalesOverview(selectedPeriod);

        // Map sales to chart data
        // Backend returns dates, let's map them directly
        const data = sales.map((s) => ({
          date: s.date, // Format if needed, e.g. new Date(s.date).toLocaleDateString()
          sales: s.totalSales,
        }));

        setChartData(data);
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      }
    };

    fetchData();
  }, [selectedPeriod]);

  return (
    <div className="rounded-2xl bg-card h-[260px] w-full shadow-sm flex flex-col p-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <p className="text-xs text-gray-600">Branch sales ({selectedPeriod})</p>

        <div className="flex gap-1.5 text-[10px]">
          {['1W', '1M', '3M', '1Y'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-2 py-0.5 rounded-md transition ${
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

      {/* Chart */}
      <div className="flex-1 w-full">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, left: 0, right: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="branchSalesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.3} />

              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tickMargin={6}
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${v / 1000}k`}
                tickMargin={6}
                domain={[0, 150000]}
                ticks={[0, 30000, 60000, 90000, 120000, 150000]}
                tick={{ fill: '#6b7280', fontSize: 10 }}
              />

              {/* ✅ SMALL TOOLTIP */}
              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="sales"
                stroke="#1d4ed8"
                strokeWidth={2}
                fill="url(#branchSalesGradient)"
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

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-card px-2 py-1 rounded-md shadow-sm text-[10px] leading-tight">
      <p className="text-gray-700 font-medium">{label}</p>
      <p className="text-blue-600">Sales: ₹{payload[0].value.toLocaleString()}</p>
    </div>
  );
}
