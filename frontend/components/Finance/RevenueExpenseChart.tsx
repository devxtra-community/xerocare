'use client';

import React from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

const data = [
  { month: 'Jan', revenue: 120000, expense: 85000 },
  { month: 'Feb', revenue: 98000, expense: 72000 },
  { month: 'Mar', revenue: 135000, expense: 90000 },
  { month: 'Apr', revenue: 110000, expense: 95000 },
  { month: 'May', revenue: 145000, expense: 88000 },
];

// 1. Custom Tooltip for Professional Data Display
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    const net = payload[0].value - payload[1].value;
    return (
      <div className="bg-card p-2 border border-border shadow-xl rounded-lg text-sm">
        <p className="font-bold text-foreground mb-2 border-b pb-1">{label} Summary</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-8">
            <span className="text-muted-foreground">Revenue:</span>
            <span className="font-mono font-semibold text-blue-600">
              AED {payload[0].value.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-muted-foreground">Expenses:</span>
            <span className="font-mono font-semibold text-rose-500">
              AED {payload[1].value.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between gap-8 pt-2 mt-1 border-t border-slate-100">
            <span className="font-bold text-slate-700">Net:</span>
            <span
              className={`font-mono font-bold ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
            >
              AED {net.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * Bar chart displaying monthly revenue vs expenses.
 * Visualises financial performance trends over time.
 */
export default function RevenueExpenseChart() {
  return (
    <div className="w-full h-[310px] mt-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={8}>
          {/* Subtle Grid Lines - only horizontal to reduce clutter */}
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 12 }}
            dy={10}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickFormatter={(value) => `AED ${value / 1000}k`}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: '#f8fafc' }} // Subtle background highlight on hover
          />

          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 500 }}
          />

          {/* Revenue Bar with Rounded Corners */}
          <Bar name="Revenue" dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />

          {/* Expense Bar with Rounded Corners */}
          <Bar
            name="Expenses"
            dataKey="expense"
            fill="#94a3b8" // Neutral slate for expense to focus on revenue
            radius={[4, 4, 0, 0]}
            barSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
