'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const data = [
  { name: 'Sales', value: 450000, color: '#003F7D' },
  { name: 'Rental', value: 320000, color: '#0284C7' },
  { name: 'Leasing', value: 280000, color: '#9BD0E5' },
  { name: 'Service', value: 150000, color: '#CBD5E1' },
];

export default function RevenueBySourceChart() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsClient(true), 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-blue-100 p-4 h-full min-h-[260px]">
      <h4 className="text-sm font-bold text-primary uppercase mb-4">Revenue by Source</h4>
      <div className="h-[180px] w-full">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: number) => `₹${val.toLocaleString()}`}
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  padding: '4px 8px',
                  fontSize: '10px',
                }}
                itemStyle={{ padding: 0, fontWeight: 'bold' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
