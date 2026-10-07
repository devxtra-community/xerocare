'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { getActiveCurrency } from '@/lib/currency';
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
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="color-mix(in srgb, var(--info) 10%, transparent)"
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: 'var(--chart-indigo)', fontWeight: 500 }}
              axisLine={{ stroke: 'color-mix(in srgb, var(--info) 10%, transparent)' }}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--chart-indigo)', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${getActiveCurrency()} ${(value / 1000).toFixed(1)}k`}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 4px 12px color-mix(in srgb, var(--foreground) 10%, transparent)',
                color: 'var(--chart-indigo)',
              }}
              labelStyle={{ color: 'var(--chart-indigo)', fontWeight: 'bold', marginBottom: '4px' }}
              cursor={{ fill: 'var(--muted)' }}
              formatter={(value: number) => [
                `${getActiveCurrency()} ${value.toLocaleString()}`,
                'Amount',
              ]}
            />
            <Bar
              dataKey="value"
              name={title || 'Amount'}
              fill="var(--chart-blue)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
