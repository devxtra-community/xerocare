'use client';

import { useEffect, useState } from 'react';
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
import { getAllEmployees, Employee } from '@/lib/employee';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';
import { ERP_CHART_COLORS, ERP_CHART_SERIES } from '@/lib/chartTheme';

interface BranchData {
  branch: string;
  count: number;
}

/**
 * Bar chart visualizing employee distribution across branches.
 * Fetches all employees and aggregates them by branch name.
 */
export default function HRBranchEmployeesGraph() {
  const [data, setData] = useState<BranchData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBranchData = async () => {
      try {
        const response = await getAllEmployees(1, 1000, 'All');
        if (response.success) {
          const employees = response.data.employees;

          const branchCounts: Record<string, number> = {};
          employees.forEach((emp: Employee) => {
            const branchName = emp.branch?.name || 'Unassigned';
            branchCounts[branchName] = (branchCounts[branchName] || 0) + 1;
          });

          const chartData: BranchData[] = Object.entries(branchCounts).map(([branch, count]) => ({
            branch,
            count,
          }));

          setData(chartData);
        }
      } catch (error) {
        console.error('Failed to fetch branch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBranchData();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border-0 p-6 h-[300px]">
        <div className="h-4 w-32 bg-muted animate-pulse rounded mb-8" />
        <div className="flex-1 min-h-0 bg-muted/50 animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-card p-5 rounded-2xl shadow-sm border border-primary/30 flex flex-col h-[300px] w-full">
      <h4 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-8">
        Branch wise Employees
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
              dataKey="branch"
              width={100}
              tick={{ fill: ERP_CHART_COLORS.axis, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<ChartTooltipContent valueFormatter={(val) => `${val} staff`} />}
              cursor={{ fill: ERP_CHART_COLORS.track, fillOpacity: 0.35 }}
            />
            <Bar dataKey="count" name="Employees" radius={[0, 5, 5, 0]} barSize={16}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={ERP_CHART_SERIES[index % ERP_CHART_SERIES.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
