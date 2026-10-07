'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const data = [
  { product: 'HP LaserJet Pro', qty: 450 },
  { product: 'Canon PIXMA', qty: 320 },
  { product: 'Epson EcoTank', qty: 280 },
  { product: 'Brother HL-L2350DW', qty: 210 },
  { product: 'Xerox VersaLink', qty: 180 },
];

/**
 * Bar chart displaying the top selling products by quantity.
 * Helps identifying popular products and demand trends.
 */
export default function MostSoldProductChart() {
  return (
    <div className="bg-card rounded-xl p-3 sm:p-4">
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke="color-mix(in srgb, var(--info) 10%, transparent)"
            />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: 'var(--chart-indigo)', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="product"
              width={80}
              tick={{ fontSize: 11, fill: 'var(--chart-indigo)', fontWeight: 500 }}
              axisLine={{ stroke: 'color-mix(in srgb, var(--info) 10%, transparent)' }}
              tickLine={false}
              tickMargin={8}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 4px 12px color-mix(in srgb, var(--foreground) 10%, transparent)',
              }}
              labelStyle={{ color: 'var(--chart-indigo)', fontWeight: 'bold' }}
              cursor={{ fill: 'var(--muted)' }}
            />
            <Bar dataKey="qty" fill="var(--primary-blue-dark)" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
