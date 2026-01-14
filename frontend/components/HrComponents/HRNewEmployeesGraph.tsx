'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { getAllEmployees, Employee } from '@/lib/employee';

interface MonthlyGrowth {
  month: string;
  count: number;
}

export default function HRNewEmployeesGraph() {
  const [data, setData] = useState<MonthlyGrowth[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGrowthData = async () => {
      try {
        const response = await getAllEmployees(1, 1000, 'All');
        if (response.success) {
          const employees = response.data.employees;

          const monthlyCounts: Record<string, number> = {};
          const months = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
          ];

          // Pre-fill with last 6 months or current year
          months.forEach((m) => (monthlyCounts[m] = 0));

          employees.forEach((emp: Employee) => {
            const date = new Date(emp.createdAt);
            const monthName = months[date.getMonth()];
            monthlyCounts[monthName] = (monthlyCounts[monthName] || 0) + 1;
          });

          const chartData: MonthlyGrowth[] = months.map((month) => ({
            month,
            count: monthlyCounts[month],
          }));

          setData(chartData);
        }
      } catch (error) {
        console.error('Failed to fetch growth data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGrowthData();
  }, []);

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-blue-100">
          <p className="font-bold text-[#2563eb] text-[10px] mb-2 uppercase tracking-widest border-b border-blue-50 pb-1">
            {label}
          </p>
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
              New Hires: <span className="text-[#2563eb] ml-1">{payload[0].value}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border-0 p-6 h-[300px]">
        <div className="h-4 w-32 bg-gray-100 animate-pulse rounded mb-8" />
        <div className="flex-1 min-h-0 bg-gray-50 animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100/50 flex flex-col h-[300px] w-full">
      <h4 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-8">
        New Employees per Month
      </h4>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, fill: '#2563eb', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
