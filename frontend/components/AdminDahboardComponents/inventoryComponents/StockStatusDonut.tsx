'use client';
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const data = [
  { name: 'In Stock', value: 120 },
  { name: 'Low Stock', value: 15 },
  { name: 'Out of Stock', value: 5 },
];

const COLORS = [
  '#2563eb', // In Stock - Blue
  '#93c5fd', // Low Stock - Light Blue
  '#ef4444', // Out of Stock - Red
];

/**
 * Donut chart displaying the overall health of inventory stock levels.
 * Segments items into In Stock, Low Stock, and Out of Stock categories.
 * Provides a quick health check indicator for inventory management.
 */
export default function StockStatusDonut() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <div className="h-full w-full bg-muted/50 rounded-lg animate-pulse" />;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 w-full relative min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontSize: '11px',
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: '10px', color: '#64748B', paddingTop: '10px' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[calc(50%+18px)] text-center pointer-events-none">
          <span className="text-xl font-bold text-primary">140</span>
          <p className="text-[9px] text-muted-foreground uppercase font-medium">Items</p>
        </div>
      </div>
    </div>
  );
}
