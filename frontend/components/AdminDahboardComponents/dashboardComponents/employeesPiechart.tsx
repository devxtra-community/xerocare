'use client';
import { PieChart, Pie, Cell } from 'recharts';
import { useState, useEffect } from 'react';
import { getAllEmployees } from '@/lib/employee';
import { StandardChartCard } from '@/components/charts/StandardChartCard';

interface ChartData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

const COLORS = {
  Employee: '#003F7D',
  Finance: '#0284C7',
  HR: '#9BD0E5',
  Other: '#CBD5E1',
};

/**
 * Pie chart component displaying employee distribution by department/role.
 * Categorizes employees into groups like Employee, Finance, HR, and Other.
 */
export default function EmployeePieChart() {
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<ChartData[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setIsClient(true);
    const fetchData = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any = await getAllEmployees();
        const employees = res.data?.employees || [];
        const roleCounts: Record<string, number> = {};

        // Count employees by role
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        employees.forEach((emp: any) => {
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
          setData([{ name: 'No Data', value: 1, color: '#f3f4f6', percentage: 0 }]);
          setTotal(0);
        } else {
          setData(chartData);
        }
      } catch (error) {
        console.error('Failed to fetch employee stats', error);
      }
    };

    fetchData();
  }, []);

  return (
    <StandardChartCard
      title="Employee Distribution"
      description="Workforce by department"
      height={280}
      loading={!isClient || data.length === 0}
    >
      <div className="flex flex-col h-full">
        <div className="relative w-[100px] h-[100px] mx-auto mb-2 flex-shrink-0">
          {isClient && (
            <PieChart width={100} height={100}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx={50}
                cy={50}
                innerRadius={30}
                outerRadius={47}
                startAngle={90}
                endAngle={-270}
                paddingAngle={3}
                stroke="#ffffff"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          )}

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-xl font-bold text-foreground leading-none mt-2 ml-2">{total}</p>
            <p className="text-[8px] text-foreground leading-tight font-medium ml-2">Total</p>
          </div>
        </div>

        <div className="w-full flex-1 overflow-hidden">
          <div className="grid grid-cols-3 text-[10px] font-semibold text-primary border-b border-border pb-1.5 mb-1.5">
            <span>Department</span>
            <span className="text-center">
              Number Of
              <br />
              Employees
            </span>
            <span className="text-right">%</span>
          </div>

          {data.map(
            (item) =>
              item.name !== 'No Data' && (
                <div key={item.name} className="grid grid-cols-3 items-center py-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-foreground">{item.name}</span>
                  </div>
                  <span className="text-center font-semibold text-foreground">{item.value}</span>
                  <span className="text-right font-semibold text-foreground">
                    {item.percentage}%
                  </span>
                </div>
              ),
          )}
        </div>
      </div>
    </StandardChartCard>
  );
}
