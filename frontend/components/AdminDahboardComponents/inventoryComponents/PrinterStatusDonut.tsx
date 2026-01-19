'use client';
import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const data = [
  { name: 'Available', value: 30 },
  { name: 'Rented', value: 45 },
  { name: 'Leased', value: 25 },
  { name: 'Sold', value: 15 },
  { name: 'Under Service', value: 5 },
];

const COLORS = [
  '#10b981', // Available - Green
  '#2563eb', // Rented - Primary Blue
  '#7c3aed', // Leased - Primary Purple-ish
  '#6b7280', // Sold - Gray
  '#ef4444', // Under Service - Red
];

export default function PrinterStatusDonut() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <div className="h-[250px] w-full bg-white rounded-2xl animate-pulse" />;

  return (
    <div className="rounded-2xl bg-white h-[320px] w-full shadow-sm flex flex-col p-4 border">
      <div className="mb-2">
        <h3 className="font-semibold text-lg">Printer Status Distribution</h3>
        <p className="text-xs text-muted-foreground">Current fleet breakdown</p>
      </div>
      <div className="flex-1 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
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
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-[-10px]">
          <span className="text-2xl font-bold text-gray-900">120</span>
          <p className="text-[10px] text-gray-500 uppercase font-medium">Total</p>
        </div>
      </div>
    </div>
  );
}
