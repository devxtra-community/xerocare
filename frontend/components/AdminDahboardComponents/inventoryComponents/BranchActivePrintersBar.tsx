'use client';
import { useState, useEffect } from 'react';
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
  { branch: 'Main', active: 40 },
  { branch: 'North', active: 25 },
  { branch: 'South', active: 18 },
  { branch: 'East', active: 30 },
  { branch: 'West', active: 22 },
];

/**
 * Bar chart displaying the number of active printers per branch.
 * Visualizes the distribution of operational units across different locations.
 */
export default function BranchActivePrintersBar() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <div className="h-[250px] w-full bg-card rounded-2xl animate-pulse" />;

  return (
    <div className="rounded-2xl bg-card h-[320px] w-full shadow-sm flex flex-col p-4 border">
      <div className="mb-2">
        <h3 className="font-semibold text-lg">Branch-wise Active</h3>
        <p className="text-xs text-muted-foreground">Distribution of active units</p>
      </div>
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{
              top: 5,
              right: 20,
              left: 10,
              bottom: 5,
            }}
            barSize={20}
          >
            <CartesianGrid
              horizontal={true}
              vertical={false}
              strokeDasharray="3 3"
              stroke="#f3f4f6"
            />
            <XAxis type="number" hide />
            <YAxis
              dataKey="branch"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }}
              width={50}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Bar dataKey="active" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="var(--primary)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
