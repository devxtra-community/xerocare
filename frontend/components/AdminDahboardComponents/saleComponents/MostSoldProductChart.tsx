'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const data = [
  { product: 'iPhone 15 Pro', qty: 120 },
  { product: 'MacBook Pro', qty: 95 },
  { product: 'iPhone 14', qty: 80 },
  { product: 'MacBook Air', qty: 70 },
];

export default function MostSoldProductChart() {
  return (
    <div className="bg-card rounded-xl p-3 sm:p-4">
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#1e3a8a' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              type="category"
              dataKey="product"
              width={100}
              tick={{ fontSize: 11, fill: '#1e3a8a' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickMargin={8}
            />
            <Tooltip contentStyle={{ fontSize: 12 }} labelStyle={{ color: '#1e3a8a' }} />
            <Bar dataKey="qty" fill="#0D47A1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
