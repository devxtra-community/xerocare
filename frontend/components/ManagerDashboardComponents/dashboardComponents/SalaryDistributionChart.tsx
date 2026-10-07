'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getHRStats } from '@/lib/employee';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';
import { ERP_CHART_SERIES } from '@/lib/chartTheme';

import { getActiveCurrency } from '@/lib/currency';

export default function SalaryDistributionChart({
  selectedYear,
}: {
  selectedYear: number | 'all';
}) {
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    setIsClient(true);
    const fetchData = async () => {
      try {
        const res = await getHRStats(selectedYear);
        if (res.success && res.data.bySalary) {
          const rawSalary = res.data.bySalary;
          const chartData = [
            { name: 'Branch Manager', value: rawSalary.BRANCH_MANAGER || 0 },
            { name: 'Manager', value: rawSalary.MANAGER || 0 },
            { name: 'Sales Staff', value: rawSalary.SALES_STAFF || 0 },
            { name: 'Rent & Lease Staff', value: rawSalary.RENT_LEASE_STAFF || 0 },
            { name: 'Service Staff', value: rawSalary.SERVICE_STAFF || 0 },
            { name: 'Finance', value: rawSalary.FINANCE || 0 },
            { name: 'Other', value: rawSalary.OTHER || 0 },
          ].filter((item) => item.value > 0);

          setData(chartData);
        }
      } catch (error) {
        console.error('Failed to fetch salary distribution data:', error);
      }
    };
    fetchData();
  }, [selectedYear]);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  if (!isClient) return <div className="h-[320px] w-full bg-card rounded-2xl animate-pulse" />;

  return (
    <div className="rounded-2xl bg-card h-[320px] w-full shadow-sm border border-primary/30 flex flex-col p-4">
      <div className="pb-2">
        <h4 className="text-sm font-semibold text-foreground">Salary Payroll Distribution</h4>
        <p className="text-[10px] text-muted-foreground">
          Total: {getActiveCurrency()} {(total / 1000).toFixed(1)}k
        </p>
      </div>
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              stroke="white"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={ERP_CHART_SERIES[index % ERP_CHART_SERIES.length]}
                />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltipContent
                  valueFormatter={(value) =>
                    `${getActiveCurrency()} ${(Number(value) / 1000).toFixed(1)}k`
                  }
                  footer={(payload) => {
                    const amount = Number(payload[0]?.value) || 0;
                    const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : '0.0';
                    return (
                      <span className="text-[11px] text-muted-foreground">
                        {percentage}% of payroll
                      </span>
                    );
                  }}
                />
              }
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                fontSize: '10px',
                fontWeight: 500,
                color: 'var(--chart-slate-dark)',
                paddingTop: '10px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
