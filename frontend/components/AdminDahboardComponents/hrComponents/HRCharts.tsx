'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const growthData = [
  { month: 'Jan', count: 120 },
  { month: 'Feb', count: 125 },
  { month: 'Mar', count: 132 },
  { month: 'Apr', count: 138 },
  { month: 'May', count: 145 },
  { month: 'Jun', count: 156 },
  { month: 'Jul', count: 162 },
  { month: 'Aug', count: 170 },
  { month: 'Sep', count: 185 },
  { month: 'Oct', count: 192 },
  { month: 'Nov', count: 205 },
  { month: 'Dec', count: 218 },
];

const departmentData = [
  { name: 'Manager', value: 15, color: '#003F7D' },
  { name: 'HR', value: 20, color: '#0284C7' },
  { name: 'Employee', value: 120, color: '#60A5FA' },
  { name: 'Finance', value: 25, color: '#9BD0E5' },
];

export default function HRCharts() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 mb-6">
      {/* Employee Growth Chart */}
      <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border-0">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Employee Growth (Monthly)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Bar
                dataKey="count"
                fill="#003F7D"
                radius={[4, 4, 0, 0]}
                barSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Distribution Chart */}
      <div className="w-full lg:w-[400px] bg-white p-6 rounded-2xl shadow-sm border-0">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Department Distribution</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={departmentData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {departmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend 
                verticalAlign="bottom" 
                align="center"
                iconType="circle"
                wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
