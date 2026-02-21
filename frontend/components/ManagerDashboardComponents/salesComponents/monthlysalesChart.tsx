'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface MonthlySalesBarChartProps {
  data: { month: string; value: number }[];
  title?: string;
}

/**
 * Bar chart component visualizing monthly performance trends.
 */
export default function MonthlySalesBarChart({ data, title }: MonthlySalesBarChartProps) {
  return (
    <div className="bg-card rounded-xl p-0">
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f9ff" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#1e3a8a', fontWeight: 500 }}
              axisLine={{ stroke: '#e0f2fe' }}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#1e3a8a', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `QAR ${(value / 1000).toFixed(1)}k`}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                color: '#1e3a8a',
              }}
              labelStyle={{ color: '#1e3a8a', fontWeight: 'bold', marginBottom: '4px' }}
              cursor={{ fill: '#f8fafc' }}
              formatter={(value: number) => [`QAR ${value.toLocaleString()}`, 'Amount']}
            />
            <Bar dataKey="value" name={title || 'Amount'} fill="#0D47A1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
