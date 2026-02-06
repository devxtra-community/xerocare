'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'Jan', profit: 130000 },
  { month: 'Feb', profit: 120000 },
  { month: 'Mar', profit: 150000 },
  { month: 'Apr', profit: 140000 },
  { month: 'May', profit: 140000 },
  { month: 'Jun', profit: 170000 },
];

export default function ProfitChart() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsClient(true), 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-blue-100 p-4 h-full min-h-[260px]">
      <h4 className="text-sm font-bold text-primary uppercase mb-6">Profit Trend</h4>
      <div className="h-[180px] w-full">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                tickFormatter={(val) => `₹${val / 1000}k`}
              />
              <Tooltip
                formatter={(val: number) => `₹${val.toLocaleString()}`}
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                }}
                itemStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#1d4ed8' }}
              />
              <Bar
                dataKey="profit"
                name="Net Profit"
                fill="#1d4ed8"
                radius={[4, 4, 0, 0]}
                barSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
