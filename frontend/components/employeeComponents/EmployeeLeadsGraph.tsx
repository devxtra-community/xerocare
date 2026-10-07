'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const data = [
  { name: 'Jan', website: 400, whatsapp: 240, instagram: 240 },
  { name: 'Feb', website: 300, whatsapp: 139, instagram: 221 },
  { name: 'Mar', website: 200, whatsapp: 980, instagram: 229 },
  { name: 'Apr', website: 278, whatsapp: 390, instagram: 200 },
  { name: 'May', website: 189, whatsapp: 480, instagram: 218 },
  { name: 'Jun', website: 239, whatsapp: 380, instagram: 250 },
  { name: 'Jul', website: 349, whatsapp: 430, instagram: 210 },
];

/**
 * Bar chart displaying lead sources (Website, WhatsApp, Instagram).
 * Visualises lead acquisition channels over time.
 */
export default function EmployeeLeadsGraph() {
  return (
    <div className="bg-card p-4 rounded-2xl shadow-sm border-none flex flex-col h-[350px] w-full">
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)' }}
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px color-mix(in srgb, var(--foreground) 10%, transparent)',
                padding: '8px',
                fontSize: '12px',
              }}
            />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="website" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="whatsapp" fill="var(--chart-blue-soft)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="instagram" fill="var(--chart-blue-light)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
