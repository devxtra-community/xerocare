'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  CartesianGrid,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

const data = [
  { name: 'Jan', website: 40, whatsapp: 24, instagram: 24 },
  { name: 'Feb', website: 30, whatsapp: 13, instagram: 22 },
  { name: 'Mar', website: 20, whatsapp: 98, instagram: 22 },
  { name: 'Apr', website: 27, whatsapp: 39, instagram: 20 },
  { name: 'May', website: 18, whatsapp: 48, instagram: 21 },
  { name: 'Jun', website: 23, whatsapp: 38, instagram: 25 },
  { name: 'Jul', website: 34, whatsapp: 43, instagram: 21 },
  { name: 'Aug', website: 29, whatsapp: 32, instagram: 19 },
  { name: 'Sep', website: 42, whatsapp: 41, instagram: 26 },
  { name: 'Oct', website: 38, whatsapp: 38, instagram: 23 },
  { name: 'Nov', website: 45, whatsapp: 46, instagram: 28 },
  { name: 'Dec', website: 52, whatsapp: 54, instagram: 32 },
];

const CustomTooltip = ({
  active,
  payload,
  label,
  sourceKey,
  sourceName,
}: TooltipProps<ValueType, NameType> & { sourceKey: string; sourceName: string }) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-blue-100">
        <p className="font-bold text-[#2563eb] text-[10px] mb-2 uppercase tracking-widest border-b border-blue-50 pb-1">
          {label}
        </p>
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
            {sourceName} Leads: <span className="text-[#2563eb] ml-1">{dataItem[sourceKey]}</span>
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
  dataKey,
  sourceName,
  isClient,
  gradientId,
}: {
  title: string;
  color: string;
  dataKey: string;
  sourceName: string;
  isClient: boolean;
  gradientId: string;
}) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100/50 flex flex-col h-[300px] w-full">
    <h4 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-8">{title}</h4>
    <div className="flex-1 w-full min-h-0">
      {isClient && (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 5,
              right: 5,
              left: -30,
              bottom: 5,
            }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
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
            />
            <Tooltip
              content={<CustomTooltip sourceKey={dataKey} sourceName={sourceName} />}
              cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  </div>
);

export default function EmployeeLeadsGraphs() {
  const [isClient, setIsClient] = useState(false);

  // Source colors (matching the Sales shades for consistency)
  const websiteColor = '#1e40af'; // Blue 800
  const whatsappColor = '#2563eb'; // Blue 600 (Primary)
  const instagramColor = '#60a5fa'; // Blue 400

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <ChartContainer
        title="Website Source (Jan - Dec)"
        color={websiteColor}
        dataKey="website"
        sourceName="Website"
        isClient={isClient}
        gradientId="colorWebsite"
      />
      <ChartContainer
        title="WhatsApp Source (Jan - Dec)"
        color={whatsappColor}
        dataKey="whatsapp"
        sourceName="WhatsApp"
        isClient={isClient}
        gradientId="colorWhatsapp"
      />
      <ChartContainer
        title="Instagram Source (Jan - Dec)"
        color={instagramColor}
        dataKey="instagram"
        sourceName="Instagram"
        isClient={isClient}
        gradientId="colorInstagram"
      />
    </div>
  );
}
