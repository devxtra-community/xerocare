'use client';
import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const data = [
  { name: 'Mon', Printer: 40, Toner: 24, Spare: 10 },
  { name: 'Tue', Printer: 30, Toner: 13, Spare: 22 },
  { name: 'Wed', Printer: 20, Toner: 65, Spare: 15 },
  { name: 'Thu', Printer: 27, Toner: 39, Spare: 40 },
  { name: 'Fri', Printer: 18, Toner: 48, Spare: 30 },
  { name: 'Sat', Printer: 23, Toner: 38, Spare: 25 },
  { name: 'Sun', Printer: 34, Toner: 43, Spare: 35 },
];

/**
 * Area chart visualizing the movement of products (Printers, Toners, Spares) over the week.
 * Helps identify high-velocity items and daily consumption trends.
 */
export default function MostMovedProductsChart() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsClient(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!isClient) return <div className="h-full w-full bg-muted/50 rounded-lg animate-pulse" />;

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPrinter" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-blue)" stopOpacity={0.1} />
              <stop offset="95%" stopColor="var(--chart-blue)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorToner" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-blue-soft)" stopOpacity={0.1} />
              <stop offset="95%" stopColor="var(--chart-blue-soft)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorSpare" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-blue-light)" stopOpacity={0.1} />
              <stop offset="95%" stopColor="var(--chart-blue-light)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--muted)" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'var(--chart-slate-dark)' }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'var(--chart-slate-dark)' }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 6px -1px color-mix(in srgb, var(--foreground) 10%, transparent)',
              fontSize: '11px',
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }}
          />
          <Area
            type="monotone"
            dataKey="Printer"
            stroke="var(--chart-blue)"
            fillOpacity={1}
            fill="url(#colorPrinter)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--chart-blue)', strokeWidth: 2, stroke: 'var(--card)' }}
            activeDot={{ r: 5 }}
          />
          <Area
            type="monotone"
            dataKey="Toner"
            stroke="var(--chart-blue-soft)"
            fillOpacity={1}
            fill="url(#colorToner)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--chart-blue-soft)', strokeWidth: 2, stroke: 'var(--card)' }}
            activeDot={{ r: 5 }}
          />
          <Area
            type="monotone"
            dataKey="Spare"
            stroke="var(--chart-blue-light)"
            fillOpacity={1}
            fill="url(#colorSpare)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--chart-blue-light)', strokeWidth: 2, stroke: 'var(--card)' }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
