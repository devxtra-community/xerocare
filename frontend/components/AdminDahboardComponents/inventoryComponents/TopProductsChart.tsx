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
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';

const data = [
  {
    productName: 'Surgical Gloves',
    stock: 5000,
    vendor: 'MediSupply Co.',
    warehouse: 'Main Warehouse',
  },
  { productName: 'N95 Masks', stock: 3200, vendor: 'SafeGuard Ltd.', warehouse: 'North Wing' },
  {
    productName: 'Syringes 5ml',
    stock: 2800,
    vendor: 'MediSupply Co.',
    warehouse: 'Main Warehouse',
  },
  { productName: 'Bandages', stock: 1500, vendor: 'HealthFirst', warehouse: 'East Wing' },
  { productName: 'Paracetamol', stock: 1200, vendor: 'PharmaCorp', warehouse: 'Downtown Clinic' },
];

export default function TopProductsChart() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <div className="h-[250px] w-full bg-card rounded-2xl animate-pulse" />;

  return (
    <div className="rounded-2xl bg-card h-[260px] w-full shadow-sm flex flex-col p-3">
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
            barSize={16}
          >
            <CartesianGrid
              horizontal={true}
              vertical={false}
              strokeDasharray="3 3"
              stroke="var(--chart-grid)"
            />
            <XAxis type="number" hide />
            <YAxis
              dataKey="productName"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--chart-slate-dark)', fontSize: 10, fontWeight: 500 }}
              width={80}
            />
            <Tooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_: string, payload?: { payload?: (typeof data)[0] }[]) =>
                    payload?.[0]?.payload?.productName || ''
                  }
                  footer={(payload: { payload?: (typeof data)[0] }[]) => (
                    <div className="space-y-0.5 border-t border-blue-50 mt-1 pt-1">
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">
                        Vendor:{' '}
                        <span className="text-gray-700">{payload?.[0]?.payload?.vendor}</span>
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">
                        Warehouse:{' '}
                        <span className="text-gray-700">{payload?.[0]?.payload?.warehouse}</span>
                      </p>
                    </div>
                  )}
                />
              }
              cursor={{ fill: 'transparent' }}
            />
            <Bar dataKey="stock" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="var(--chart-blue)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
