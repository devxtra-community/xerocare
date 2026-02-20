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
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';

/**
 * Container component for HR analytics charts.
 * Displays employee growth (bar chart) and role distribution (pie chart).
 * Visualizes workforce trends and composition.
 */
export default function HRCharts() {
  const [roleData, setRoleData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [growthData, setGrowthData] = useState<{ month: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getHRStats();
        if (response.success) {
          const stats = response.data;

          const formatted = [
            { name: 'ADMIN', value: stats.byRole.ADMIN || 0, color: '#0F172A' }, // Slate-900
            { name: 'HR', value: stats.byRole.HR || 0, color: '#334155' }, // Slate-700
            { name: 'MANAGER', value: stats.byRole.MANAGER || 0, color: '#475569' }, // Slate-600
            { name: 'FINANCE', value: stats.byRole.FINANCE || 0, color: '#0D9488' }, // Teal-600
            { name: 'EMPLOYEE', value: stats.byRole.EMPLOYEE || 0, color: 'var(--primary)' }, // Red-600
          ].filter((item) => item.value > 0);

          setRoleData(formatted);
          if (stats.growthData) {
            setGrowthData(stats.growthData);
          }
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
      <div className="flex-1 bg-card p-6 rounded-2xl shadow-sm border-0">
        <h3 className="text-lg font-semibold text-primary mb-4">Employee Growth (Monthly)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 12 }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip content={<ChartTooltipContent />} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="count" fill="#003F7D" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Role Distribution Chart */}
      <div className="w-full lg:w-[400px] bg-card p-6 rounded-2xl shadow-sm border-0">
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
              <Tooltip content={<ChartTooltipContent />} />
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
