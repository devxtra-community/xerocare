'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { getHRStats } from '@/lib/employee';
import { Loader2 } from 'lucide-react';

const mockGrowthData = [
  { month: 'Jan', count: 12 },
  { month: 'Feb', count: 15 },
  { month: 'Mar', count: 18 },
  { month: 'Apr', count: 22 },
  { month: 'May', count: 25 },
  { month: 'Jun', count: 32 },
  { month: 'Jul', count: 38 },
  { month: 'Aug', count: 42 },
  { month: 'Sep', count: 55 },
  { month: 'Oct', count: 62 },
  { month: 'Nov', count: 75 },
  { month: 'Dec', count: 88 },
];

export default function HRCharts() {
  const [roleData, setRoleData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getHRStats();
        if (response.success) {
          const stats = response.data;
          const formatted = [
            { name: 'ADMIN', value: stats.byRole.ADMIN || 0, color: '#003F7D' },
            { name: 'HR', value: stats.byRole.HR || 0, color: '#0284C7' },
            { name: 'MANAGER', value: stats.byRole.MANAGER || 0, color: '#60A5FA' },
            { name: 'EMPLOYEE', value: stats.byRole.EMPLOYEE || 0, color: '#9BD0E5' },
          ];
          setRoleData(formatted);
        }
      } catch (error) {
        console.error('Failed to fetch HR stats for charts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 mb-6">
      {/* Employee Growth Chart */}
      <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border-0">
        <h3 className="text-lg font-semibold text-primary mb-4">Employee Growth (Monthly)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockGrowthData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 12 }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Bar dataKey="count" fill="#003F7D" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Role Distribution Chart */}
      <div className="w-full lg:w-[400px] bg-white p-6 rounded-2xl shadow-sm border-0">
        <h3 className="text-lg font-semibold text-primary mb-4">Role Distribution</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={roleData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {roleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
