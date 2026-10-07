'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { salesService } from '@/services/salesService';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';
import { ERP_CHART_SERIES } from '@/lib/chartTheme';

import { getActiveCurrency } from '@/lib/currency';

export default function RevenuePieChart({ selectedYear }: { selectedYear: number | 'all' }) {
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    setIsClient(true);
    const fetchData = async () => {
      try {
        const res = await salesService.getBranchSalesTotals(
          selectedYear === 'all' ? undefined : selectedYear,
        );
        const chartData = res.salesByType.map((item) => ({
          name: item.saleType.charAt(0) + item.saleType.slice(1).toLowerCase() + ' Revenue',
          value: item.total,
        }));
        setData(chartData);
      } catch (error) {
        console.error('Failed to fetch pie chart data:', error);
      }
    };
    fetchData();
  }, [selectedYear]);

  if (!isClient) return <div className="h-[320px] w-full bg-card rounded-2xl animate-pulse" />;

  return (
    <div className="rounded-2xl bg-card h-[320px] w-full shadow-sm border border-primary/30 flex flex-col p-4">
      <div className="pb-2">
        <h4 className="text-sm font-semibold text-foreground">Revenue Distribution</h4>
        <p className="text-[10px] text-muted-foreground">Breakdown by sales type</p>
      </div>
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
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
                    `${getActiveCurrency()} ${Number(value).toLocaleString()}`
                  }
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
