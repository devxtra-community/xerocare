'use client';

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
  { name: 'Jan', sales: 4000, rent: 2400, lease: 2400 },
  { name: 'Feb', sales: 3000, rent: 1398, lease: 2210 },
  { name: 'Mar', sales: 2000, rent: 9800, lease: 2290 },
  { name: 'Apr', sales: 2780, rent: 3908, lease: 2000 },
  { name: 'May', sales: 1890, rent: 4800, lease: 2181 },
  { name: 'Jun', sales: 2390, rent: 3800, lease: 2500 },
  { name: 'Jul', sales: 3490, rent: 4300, lease: 2100 },
];

export default function EmployeeSalesGraph() {
  return (
    <div className="bg-card p-4 rounded-2xl shadow-sm border-none flex flex-col h-[350px] w-full">
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorLease" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#93c5fd" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              dy={10}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                padding: '8px',
                fontSize: '12px',
              }}
            />
            <Legend verticalAlign="top" height={36} />
            <Area
              type="monotone"
              dataKey="sales"
              stackId="1"
              stroke="#2563eb"
              fill="url(#colorSales)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="rent"
              stackId="1"
              stroke="#60a5fa"
              fill="url(#colorRent)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="lease"
              stackId="1"
              stroke="#93c5fd"
              fill="url(#colorLease)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
