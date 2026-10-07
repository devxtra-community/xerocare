'use client';
import { PieChart, Pie, Cell } from 'recharts';
import { useState, useEffect } from 'react';
import { getAllEmployees, Employee } from '@/lib/employee';

interface ChartData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

const COLORS = {
  Employee: 'var(--primary-blue-dark)',
  Finance: 'var(--info)',
  HR: 'var(--chart-blue-light)',
  Other: 'var(--border)',
};

/**
 * Pie chart component displaying employee distribution by department/role.
 * Categorizes employees into groups like Employee, Finance, HR, and Other.
 */
export default function EmployeePieChart({
  selectedYear,
  branchId,
}: {
  selectedYear: number | 'all';
  branchId?: string;
}) {
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<ChartData[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setIsClient(true);
    const fetchData = async () => {
      try {
        // A distribution has to see every employee, so ask for one large page
        // rather than the default 20 (which silently truncated the breakdown).
        const res = await getAllEmployees(1, 1000, undefined, undefined, branchId);
        let employees = res.data?.employees || [];

        // Filter by year if not 'all'
        if (selectedYear !== 'all') {
          employees = employees.filter((emp: Employee) => {
            const date = new Date(emp.createdAt);
            return date.getFullYear() === selectedYear;
          });
        }

        const roleCounts: Record<string, number> = {};

        // Count employees by role
        employees.forEach((emp: Employee) => {
          let role = emp.role || 'Other';
          // Normalize role names
          if (role === 'EMPLOYEE') role = 'Employee';
          if (role === 'FINANCE') role = 'Finance';
          if (role === 'HR') role = 'HR';
          if (role === 'MANAGER') role = 'Other';

          roleCounts[role] = (roleCounts[role] || 0) + 1;
        });

        const totalCount = employees.length;
        setTotal(totalCount);

        const chartData = Object.keys(roleCounts).map((role) => {
          const count = roleCounts[role];
          const colorKey = role as keyof typeof COLORS;
          return {
            name: role,
            value: count,
            color: COLORS[colorKey] || COLORS.Other,
            percentage: totalCount > 0 ? parseFloat(((count / totalCount) * 100).toFixed(1)) : 0,
          };
        });

        // Ensure we always have some data to display or valid empty state
        if (chartData.length === 0) {
          setData([{ name: 'No Data', value: 1, color: 'var(--muted)', percentage: 0 }]);
          setTotal(0);
        } else {
          setData(chartData);
        }
      } catch (error) {
        console.error('Failed to fetch employee stats', error);
      }
    };

    fetchData();
  }, [selectedYear, branchId]);

  return (
    <div className="rounded-2xl bg-card p-3 sm:p-4 shadow-sm w-full h-[340px] flex flex-col">
      {!isClient || data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading distribution...</p>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="relative w-[148px] h-[148px] mx-auto mb-3 flex-shrink-0">
            <PieChart width={148} height={148}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx={74}
                cy={74}
                innerRadius={44}
                outerRadius={68}
                startAngle={90}
                endAngle={-270}
                paddingAngle={3}
                stroke="var(--card)"
                strokeWidth={3}
                isAnimationActive={false}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-2xl font-semibold text-foreground leading-none">{total}</p>
              <p className="mt-1 text-[10px] text-muted-foreground leading-tight font-medium">
                Employees
              </p>
            </div>
          </div>

          <div className="w-full flex-1 overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_72px_48px] text-[11px] font-semibold text-primary border-b border-border pb-2 mb-1">
              <span>Department</span>
              <span className="text-center">Employees</span>
              <span className="text-right">Share</span>
            </div>

            {data.map(
              (item) =>
                item.name !== 'No Data' && (
                  <div
                    key={item.name}
                    className="grid grid-cols-[minmax(0,1fr)_72px_48px] items-center py-1.5 text-[13px]"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate font-medium text-foreground">{item.name}</span>
                    </div>
                    <span className="text-center font-medium text-foreground">{item.value}</span>
                    <span className="text-right font-semibold text-foreground">
                      {item.percentage}%
                    </span>
                  </div>
                ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
