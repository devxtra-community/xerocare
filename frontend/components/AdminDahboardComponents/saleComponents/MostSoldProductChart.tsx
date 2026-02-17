'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';

interface MostSoldProductChartProps {
  data: { product: string; qty: number }[];
}

const COLORS = ['#0D47A1', '#1976D2', '#2196F3', '#00BCD4', '#009688'];

export default function MostSoldProductChart({ data }: MostSoldProductChartProps) {
  const chartData = (data || []).map((item) => ({
    name: item.product.length > 20 ? item.product.substring(0, 20) + '...' : item.product,
    fullName: item.product,
    value: item.qty,
  }));

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_: string, payload?: { payload?: (typeof chartData)[0] }[]) =>
                  payload?.[0]?.payload?.fullName || ''
                }
              />
            }
          />
          <Legend
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
