'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';
import { ERP_CHART_COLORS } from '@/lib/chartTheme';

interface MostSoldProductChartProps {
  data: { product: string; qty: number }[];
}

/**
 * Horizontal ranking chart displaying the most sold products by quantity.
 */
export default function MostSoldProductChart({ data }: MostSoldProductChartProps) {
  const chartData = (data || []).map((item) => ({
    name: item.product.length > 20 ? item.product.substring(0, 20) + '...' : item.product,
    fullName: item.product,
    value: item.qty,
  }));

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
        >
          <CartesianGrid horizontal={false} stroke={ERP_CHART_COLORS.grid} />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: ERP_CHART_COLORS.axis }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: ERP_CHART_COLORS.axis }}
          />
          <Tooltip
            cursor={{ fill: ERP_CHART_COLORS.track, fillOpacity: 0.35 }}
            content={
              <ChartTooltipContent
                labelFormatter={(_: string, payload?: { payload?: (typeof chartData)[0] }[]) =>
                  payload?.[0]?.payload?.fullName || ''
                }
              />
            }
          />
          <Bar
            dataKey="value"
            name="Quantity"
            fill={ERP_CHART_COLORS.primary}
            radius={[0, 5, 5, 0]}
            barSize={16}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
