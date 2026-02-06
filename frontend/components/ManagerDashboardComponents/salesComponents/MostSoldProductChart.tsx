'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const data = [
  { product: 'HP LaserJet Pro', qty: 450 },
  { product: 'Canon PIXMA', qty: 320 },
  { product: 'Epson EcoTank', qty: 280 },
  { product: 'Brother HL-L2350DW', qty: 210 },
  { product: 'Xerox VersaLink', qty: 180 },
];

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
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f9ff" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#1e3a8a', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="product"
              width={80}
              tick={{ fontSize: 11, fill: '#1e3a8a', fontWeight: 500 }}
              axisLine={{ stroke: '#e0f2fe' }}
              tickLine={false}
              tickMargin={8}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              labelStyle={{ color: '#1e3a8a', fontWeight: 'bold' }}
              cursor={{ fill: '#f8fafc' }}
            />
            <Bar dataKey="qty" fill="#0D47A1" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
