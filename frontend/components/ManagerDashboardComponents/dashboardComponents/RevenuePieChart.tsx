'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { salesService } from '@/services/salesService';

const COLORS = ['#2563eb', '#3b82f6', '#93c5fd'];

export default function RevenuePieChart() {
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    setIsClient(true);
    const fetchData = async () => {
      try {
        const res = await salesService.getBranchSalesTotals();
        const chartData = res.salesByType.map((item) => ({
          name: item.saleType.charAt(0) + item.saleType.slice(1).toLowerCase() + ' Revenue',
          value: item.total,
        }));
        setData(chartData);
      } catch (error) {
        console.error('Failed to fetch pie chart data:', error);
      }
    };
    fetchData();
  }, []);

  if (!isClient) return <div className="h-[320px] w-full bg-white rounded-2xl animate-pulse" />;

  return (
    <div className="rounded-2xl bg-white h-[320px] w-full shadow-sm border border-blue-50 flex flex-col p-4">
      <div className="pb-2">
        <h4 className="text-sm font-semibold text-gray-800">Revenue Distribution</h4>
        <p className="text-[10px] text-gray-500">Breakdown by sales type</p>
      </div>
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0];
                  return (
                    <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-50">
                      <p className="text-xs font-bold text-gray-700">{item.name}</p>
                      <p className="text-xs text-primary font-medium">
                        ₹{(item.value ?? 0).toLocaleString()}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                fontSize: '10px',
                fontWeight: 500,
                color: '#64748b',
                paddingTop: '10px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
