'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  TooltipProps,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

const monthlyData = [
  { name: 'Jan', customers: 45, new: 12, highValue: 5 },
  { name: 'Feb', customers: 52, new: 15, highValue: 6 },
  { name: 'Mar', customers: 48, new: 10, highValue: 8 },
  { name: 'Apr', customers: 61, new: 22, highValue: 12 },
  { name: 'May', customers: 55, new: 18, highValue: 9 },
  { name: 'Jun', customers: 67, new: 25, highValue: 14 },
  { name: 'Jul', customers: 72, new: 30, highValue: 18 },
  { name: 'Aug', customers: 69, new: 21, highValue: 15 },
  { name: 'Sep', customers: 78, new: 32, highValue: 20 },
  { name: 'Oct', customers: 85, new: 38, highValue: 22 },
  { name: 'Nov', customers: 92, new: 45, highValue: 25 },
  { name: 'Dec', customers: 88, new: 35, highValue: 24 },
];

const sourceData = [
  { name: 'Direct', value: 650 },
  { name: 'Leads', value: 890 },
];

const COLORS = ['#2563eb', '#60a5fa', '#93c5fd', '#1e40af'];

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-blue-100">
        <p className="font-bold text-[#2563eb] text-[10px] mb-2 uppercase tracking-widest border-b border-blue-50 pb-1">
          {label}
        </p>
        {payload.map((entry, index) => (
          <p key={index} className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">
            {entry.name}: <span className="text-[#2563eb] ml-1">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100/50 flex flex-col h-[300px] w-full">
    <h4 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-6">{title}</h4>
    <div className="flex-1 w-full min-h-0">{children}</div>
  </div>
);

export default function EmployeeCustomerGraphs() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Customers Per Month (Bar) */}
      <ChartCard title="Total Customers Per Month">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.4 }} />
            <Bar dataKey="customers" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 2. Customer Source (Donut) */}
      <ChartCard title="Customer Source (Direct vs Leads)">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sourceData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {sourceData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value) => (
                <span className="text-xs font-semibold text-gray-500">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 3. New vs High Value (Line or Bar) - To satisfy '3 graphs' */}
      <ChartCard title="New vs High Value Customers">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="new" stroke="#2563eb" strokeWidth={2} dot={false} />
            <Line
              type="monotone"
              dataKey="highValue"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
            />
            <Legend wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
