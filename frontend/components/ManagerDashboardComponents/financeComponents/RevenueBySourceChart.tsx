'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';

import { getActiveCurrency } from '@/lib/currency';
const data = [
  { name: 'Sales', value: 450000, color: '#003F7D' },
  { name: 'Rental', value: 320000, color: '#0284C7' },
  { name: 'Leasing', value: 280000, color: '#9BD0E5' },
  { name: 'Service', value: 150000, color: '#CBD5E1' },
];

/**
 * Pie chart displaying revenue distribution by source (Sales, Rental, Leasing, Service).
 * Visualizes the contribution of different business streams to total revenue.
 */
export default function RevenueBySourceChart() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsClient(true), 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-4 h-full min-h-[260px]">
      <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
        Revenue by Source
      </h4>
      <div className="h-[180px] w-full">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {/* A blue monochrome ramp — light-to-dark reads as intensity of the same
                  measure, where four unrelated hues would read as four unrelated things. */}
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={
                  <ChartTooltipContent
                    valueFormatter={(val) => `${getActiveCurrency()} ${val.toLocaleString()}`}
                  />
                }
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span style={{ color: '#475569', fontSize: 11, fontWeight: 600 }}>{value}</span>
                )}
                wrapperStyle={{ paddingTop: '4px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
