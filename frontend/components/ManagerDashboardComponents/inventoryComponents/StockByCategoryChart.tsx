'use client';
import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const data = [
  { category: 'Printer', units: 450, color: 'var(--primary)' },
  { category: 'Spare', units: 820, color: 'var(--chart-blue)' },
  { category: 'Consumable', units: 1200, color: 'var(--chart-blue-soft)' },
  { category: 'Accessory', units: 300, color: 'var(--chart-blue-lighter)' },
];

/**
 * Bar chart displaying stock distribution by category (Printer, Spare, Consumable, Accessory).
 * Visualizes the composition of inventory to ensure balanced stock levels.
 */
export default function StockByCategoryChart() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsClient(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!isClient) return <div className="h-full w-full bg-muted/50 rounded-lg animate-pulse" />;

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} layout="vertical">
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={true}
            vertical={false}
            stroke="var(--muted)"
          />
          <XAxis type="number" hide />
          <YAxis
            dataKey="category"
            type="category"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fontWeight: 500, fill: 'var(--chart-slate-dark)' }}
            width={80}
          />
          <Tooltip
            cursor={{ fill: 'var(--muted)' }}
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 6px -1px color-mix(in srgb, var(--foreground) 10%, transparent)',
              fontSize: '11px',
            }}
          />
          <Bar dataKey="units" radius={[0, 4, 4, 0]} barSize={24}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
