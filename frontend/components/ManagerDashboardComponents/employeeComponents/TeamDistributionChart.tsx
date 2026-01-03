'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
  { name: 'Sales', value: 45, color: '#003F7D' },
  { name: 'Service', value: 32, color: '#0284C7' },
  { name: 'Inventory', value: 28, color: '#9BD0E5' },
  { name: 'Finance', value: 19, color: '#CBD5E1' },
];

export default function TeamDistributionChart() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100/30 flex flex-col h-full min-h-[260px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-blue-900 uppercase">Team Distribution</h3>
      </div>
      
      <div className="flex-1 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-[180px] h-[180px]">
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
                  isAnimationActive={true}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-2 border border-gray-100 shadow-lg rounded-lg text-xs font-bold text-blue-900">
                          {payload[0].name}: {payload[0].value} Employees
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-blue-900">{total}</span>
            <span className="text-[10px] text-gray-500 font-bold uppercase">Total</span>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 gap-2 w-full">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-bold text-gray-700">{item.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-blue-900">{item.value}</span>
                <span className="text-[10px] font-bold text-gray-400 w-8 text-right">
                  {Math.round((item.value / total) * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
