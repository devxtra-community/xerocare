'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  CartesianGrid,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

const data = [
  {
    name: 'Jan',
    salesAmount: 4000,
    salesCount: 45,
    rentAmount: 2400,
    rentCount: 12,
    leaseAmount: 2400,
    leaseCount: 8,
  },
  {
    name: 'Feb',
    salesAmount: 3000,
    salesCount: 32,
    rentAmount: 1398,
    rentCount: 8,
    leaseAmount: 2210,
    leaseCount: 7,
  },
  {
    name: 'Mar',
    salesAmount: 2000,
    salesCount: 28,
    rentAmount: 9800,
    rentCount: 22,
    leaseAmount: 2290,
    leaseCount: 9,
  },
  {
    name: 'Apr',
    salesAmount: 2780,
    salesCount: 35,
    rentAmount: 3908,
    rentCount: 15,
    leaseAmount: 2000,
    leaseCount: 6,
  },
  {
    name: 'May',
    salesAmount: 1890,
    salesCount: 25,
    rentAmount: 4800,
    rentCount: 18,
    leaseAmount: 2181,
    leaseCount: 8,
  },
  {
    name: 'Jun',
    salesAmount: 2390,
    salesCount: 30,
    rentAmount: 3800,
    rentCount: 14,
    leaseAmount: 2500,
    leaseCount: 10,
  },
  {
    name: 'Jul',
    salesAmount: 3490,
    salesCount: 42,
    rentAmount: 4300,
    rentCount: 16,
    leaseAmount: 2100,
    leaseCount: 8,
  },
  {
    name: 'Aug',
    salesAmount: 2900,
    salesCount: 38,
    rentAmount: 3200,
    rentCount: 14,
    leaseAmount: 1900,
    leaseCount: 7,
  },
  {
    name: 'Sep',
    salesAmount: 4200,
    salesCount: 48,
    rentAmount: 4100,
    rentCount: 18,
    leaseAmount: 2600,
    leaseCount: 11,
  },
  {
    name: 'Oct',
    salesAmount: 3800,
    salesCount: 40,
    rentAmount: 3800,
    rentCount: 15,
    leaseAmount: 2300,
    leaseCount: 9,
  },
  {
    name: 'Nov',
    salesAmount: 4500,
    salesCount: 52,
    rentAmount: 4600,
    rentCount: 19,
    leaseAmount: 2800,
    leaseCount: 12,
  },
  {
    name: 'Dec',
    salesAmount: 5200,
    salesCount: 60,
    rentAmount: 5400,
    rentCount: 24,
    leaseAmount: 3200,
    leaseCount: 15,
  },
];

const CustomTooltip = ({
  active,
  payload,
  label,
  countKey,
  amountKey,
}: TooltipProps<ValueType, NameType> & { countKey: string; amountKey: string }) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-blue-100">
        <p className="font-bold text-[#2563eb] text-[10px] mb-2 uppercase tracking-widest border-b border-blue-50 pb-1">
          {label}
        </p>
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
            Orders: <span className="text-[#2563eb] ml-1">{dataItem[countKey]}</span>
          </p>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
            Income:{' '}
            <span className="text-[#2563eb] ml-1">₹{dataItem[amountKey]?.toLocaleString()}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const ChartContainer = ({
  title,
  color,
  dataKeyAmount,
  dataKeyCount,
  isClient,
}: {
  title: string;
  color: string;
  dataKeyAmount: string;
  dataKeyCount: string;
  isClient: boolean;
}) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100/50 flex flex-col h-[300px] w-full">
    <h4 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-8">{title}</h4>
    <div className="flex-1 w-full min-h-0">
      {isClient && (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 5,
              left: -30,
              bottom: 5,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
              tickFormatter={(val) => `₹${val / 1000}k`}
            />
            <Tooltip
              content={<CustomTooltip countKey={dataKeyCount} amountKey={dataKeyAmount} />}
              cursor={{ fill: '#f1f5f9', opacity: 0.4 }}
            />
            <Bar dataKey={dataKeyAmount} fill={color} radius={[4, 4, 0, 0]} barSize={10} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  </div>
);

export default function EmployeeSalesGraphs() {
  const [isClient, setIsClient] = useState(false);

  // Primary color variations (Blue shades)
  const salesColor = '#1e40af'; // Blue 800
  const rentColor = '#2563eb'; // Blue 600 (Primary)
  const leaseColor = '#60a5fa'; // Blue 400

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <ChartContainer
        title="Sales Trend (Jan - Dec)"
        color={salesColor}
        dataKeyAmount="salesAmount"
        dataKeyCount="salesCount"
        isClient={isClient}
      />
      <ChartContainer
        title="Rent Trend (Jan - Dec)"
        color={rentColor}
        dataKeyAmount="rentAmount"
        dataKeyCount="rentCount"
        isClient={isClient}
      />
      <ChartContainer
        title="Lease Trend (Jan - Dec)"
        color={leaseColor}
        dataKeyAmount="leaseAmount"
        dataKeyCount="leaseCount"
        isClient={isClient}
      />
    </div>
  );
}
