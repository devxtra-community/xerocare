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
} from 'recharts';
import { getAllEmployees, Employee } from '@/lib/employee';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';

interface DepartmentData {
  department: string;
  count: number;
}

export default function HRDepartmentGraph() {
  const [data, setData] = useState<DepartmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDepartmentData = async () => {
      try {
        const response = await getAllEmployees(1, 1000, 'All');
        if (response.success) {
          const employees = response.data.employees;

          // Count employees by role/department
          const departmentCounts: Record<string, number> = {};
          employees.forEach((emp: Employee) => {
            const dept = emp.role || 'Unknown';
            departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
          });

          // Convert to array format for chart
          const chartData: DepartmentData[] = Object.entries(departmentCounts).map(
            ([department, count]) => ({
              department,
              count,
            }),
          );

          setData(chartData);
        }
      } catch (error) {
        console.error('Failed to fetch department data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartmentData();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border-0 p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Department Distribution</h3>
        <div className="h-[300px] bg-gray-100 animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-card p-5 rounded-2xl shadow-sm border border-blue-100/50 flex flex-col h-[300px] w-full">
      <h4 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-8">
        Department Distribution
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
              dataKey="department"
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
            <Tooltip
              content={<ChartTooltipContent valueFormatter={(val) => `${val} employees`} />}
            />
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
