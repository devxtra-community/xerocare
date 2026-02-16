'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface MonthlySalesBarChartProps {
  data: { month: string; sales: number }[];
}

export default function MonthlySalesBarChart({ data }: MonthlySalesBarChartProps) {
  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E3A8A" stopOpacity={1} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.3} />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickMargin={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickFormatter={(value) => `${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
          />
          <Tooltip
            cursor={{ fill: '#f1f5f9' }}
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="sales" fill="url(#barGradient)" radius={[4, 4, 0, 0]} barSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
