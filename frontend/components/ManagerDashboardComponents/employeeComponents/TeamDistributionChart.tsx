'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface TeamDistributionChartProps {
  data?: { name: string; value: number; color: string }[];
  loading?: boolean;
}

const defaultData = [
  { name: 'Sales', value: 0, color: '#003F7D' },
  { name: 'Rent & Lease', value: 0, color: '#0284C7' },
  { name: 'Service', value: 0, color: '#0891b2' },
  { name: 'Other', value: 0, color: '#CBD5E1' },
];

export default function TeamDistributionChart({
  data = defaultData,
  loading,
}: TeamDistributionChartProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsClient(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="bg-card rounded-xl shadow-sm p-4 border border-blue-100/30 flex flex-col h-full min-h-[260px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-primary uppercase">Team Distribution</h3>
      </div>

      <div className="flex-1 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-[180px] h-[180px]">
          {isClient && !loading && (
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
                        <div className="bg-card p-2 border border-gray-100 shadow-lg rounded-lg text-xs font-bold text-primary">
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
          {loading && (
            <div className="w-full h-full rounded-full border-4 border-muted border-t-primary animate-spin" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-primary">{loading ? '...' : total}</span>
            <span className="text-[10px] text-muted-foreground font-bold uppercase">Total</span>
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
                <span className="text-xs font-bold text-primary">{item.value}</span>
                <span className="text-[10px] font-bold text-gray-400 w-8 text-right">
                  {total > 0 ? Math.round((item.value / total) * 100) : 0}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
