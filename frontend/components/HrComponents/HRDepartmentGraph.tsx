'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getAllEmployees, Employee } from '@/lib/employee';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';
import { ERP_CHART_COLORS } from '@/lib/chartTheme';

interface DepartmentData {
  department: string;
  count: number;
}

/**
 * Horizontal bar chart visualizing employee distribution across departments (Roles).
 * Fetches all employees and aggregates them by role.
 */
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
        <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-card p-5 rounded-2xl shadow-sm border border-primary/30 flex flex-col h-[300px] w-full">
      <h4 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-8">
        Department Distribution
      </h4>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid horizontal={false} stroke={ERP_CHART_COLORS.grid} />
            <XAxis
              type="number"
              tick={{ fill: ERP_CHART_COLORS.axis, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="department"
              width={100}
              tick={{ fill: ERP_CHART_COLORS.axis, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<ChartTooltipContent valueFormatter={(val) => `${val} employees`} />}
            />
            <Bar
              dataKey="count"
              name="Employees"
              fill={ERP_CHART_COLORS.primary}
              radius={[0, 5, 5, 0]}
              barSize={16}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
