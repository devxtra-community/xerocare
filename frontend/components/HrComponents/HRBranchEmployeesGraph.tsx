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

interface BranchData {
  branch: string;
  count: number;
}

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

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
        <div className="h-4 w-32 bg-gray-100 animate-pulse rounded mb-8" />
        <div className="flex-1 min-h-0 bg-muted/50 animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-card p-5 rounded-2xl shadow-sm border border-blue-100/50 flex flex-col h-[300px] w-full">
      <h4 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-8">
        Branch wise Employees
      </h4>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="branch"
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
              content={<ChartTooltipContent valueFormatter={(val) => `${val} staff`} />}
              cursor={{ fill: '#f1f5f9' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={30}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
