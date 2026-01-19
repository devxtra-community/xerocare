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

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: (typeof data)[0] }[];
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-semibold text-sm">{data.productName}</p>
        <p className="text-xs text-gray-600">
          Stock: <span className="font-bold text-primary">{data.stock}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">Vendor: {data.vendor}</p>
        <p className="text-xs text-gray-500">Warehouse: {data.warehouse}</p>
      </div>
    );
  }
  return null;
};

export default function TopProductsChart() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <div className="h-[250px] w-full bg-white rounded-2xl animate-pulse" />;

  return (
    <div className="rounded-2xl bg-white h-[260px] w-full shadow-sm flex flex-col p-3">
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
              stroke="#f3f4f6"
            />
            <XAxis type="number" hide />
            <YAxis
              dataKey="productName"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 500 }}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            <Bar dataKey="stock" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#2563eb" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
