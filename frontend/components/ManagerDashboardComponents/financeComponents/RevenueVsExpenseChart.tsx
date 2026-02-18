'use client';

import React, { useState, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const data = [
  { month: 'Jan', revenue: 450000, expense: 320000 },
  { month: 'Feb', income: 420000, expense: 300000 },
  { month: 'Mar', revenue: 500000, expense: 350000 },
  { month: 'Apr', revenue: 470000, expense: 330000 },
  { month: 'May', revenue: 520000, expense: 380000 },
  { month: 'Jun', revenue: 480000, expense: 310000 },
];

/**
 * Composed chart comparing monthly revenue against expenses.
 * Uses bars for revenue/expenses and a line for revenue trend.
 * Critical for analyzing financial performance and efficiency.
 */
export default function RevenueVsExpenseChart() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsClient(true), 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-blue-100 p-4 h-full min-h-[260px]">
      <h4 className="text-sm font-bold text-primary uppercase mb-6">Revenue vs Expenses</h4>
      <div className="h-[180px] w-full">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                }}
                itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }}
              />
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill="#1d4ed8"
                radius={[4, 4, 0, 0]}
                barSize={20}
              />
              <Bar
                dataKey="expense"
                name="Expenses"
                fill="#93c5fd"
                radius={[4, 4, 0, 0]}
                barSize={20}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#1d4ed8"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
