'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  ReferenceLine,
  Brush,
} from 'recharts';

import { getMyInvoices, Invoice } from '@/lib/invoice';
import { Loader2 } from 'lucide-react';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';

interface SalesChartDataItem {
  name: string;
  salesCount: number;
  salesAmount: number;
  [key: string]: string | number;
}

const ChartContainer = ({
  title,
  color,
  dataKeyAmount,
  data,
}: {
  title: string;
  color: string;
  dataKeyAmount: string;
  data: SalesChartDataItem[];
}) => (
  <div className="bg-card p-5 rounded-2xl shadow-sm border border-blue-100/50 flex flex-col h-[300px] w-full">
    <h4 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-8">{title}</h4>
    <div className="flex-1 w-full min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 5,
            left: -30,
            bottom: 5,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#e2e8f0"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
            dy={10}
            interval={0}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
            tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
          />
          <Tooltip content={<ChartTooltipContent />} cursor={{ fill: '#f1f5f9', opacity: 0.4 }} />
          <Bar dataKey={dataKeyAmount} fill={color} radius={[4, 4, 0, 0]} barSize={10} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const ForexChartContainer = ({
  title,
  color,
  dataKeyAmount,
  data,
}: {
  title: string;
  color: string;
  dataKeyAmount: string;
  data: SalesChartDataItem[];
}) => {
  const average =
    data.reduce((sum, item) => sum + (Number(item[dataKeyAmount]) || 0), 0) / data.length || 0;

  return (
    <div className="bg-card p-5 rounded-2xl shadow-sm border border-blue-100/50 flex flex-col h-[300px] w-full">
      <h4 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-8">
        {title}
      </h4>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 10,
              left: -20,
              bottom: 5,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }}
              dy={10}
              interval={2}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }}
              tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
              domain={['auto', 'auto']}
            />
            <Tooltip
              content={
                <ChartTooltipContent
                  valueFormatter={(value) => `₹${Number(value).toLocaleString()}`}
                />
              }
              cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <ReferenceLine
              y={average}
              stroke={color}
              strokeDasharray="3 3"
              label={{ value: 'AVG', position: 'right', fill: color, fontSize: 9 }}
            />
            <Line
              type="monotone"
              dataKey={dataKeyAmount}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
            />
            <Brush dataKey="name" height={20} stroke="#cbd5e1" fill="#f8fafc" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

interface EmployeeSalesGraphsProps {
  invoices?: Invoice[];
}

/**
 * Analytics charts for employee sales performance.
 * Displays total sales revenue per month and per day.
 */
export default function EmployeeSalesGraphs({ invoices: propInvoices }: EmployeeSalesGraphsProps) {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<SalesChartDataItem[]>([]);
  const [dailyData, setDailyData] = useState<SalesChartDataItem[]>([]);

  // Primary color variations (Blue shades)
  const salesColor = '#1e40af'; // Blue 800
  const dailyColor = '#2563eb'; // Blue 600

  useEffect(() => {
    const fetchData = async () => {
      try {
        let invoices = propInvoices;
        if (!invoices) {
          invoices = await getMyInvoices();
        }
        // Filter out rejected sales from graphs
        const salesInvoices = invoices.filter(
          (inv) => inv.saleType === 'SALE' && inv.status !== 'REJECTED',
        );

        // Initialize Monthly Data
        const months = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
        const mData = months.map((name) => ({
          name,
          salesCount: 0,
          salesAmount: 0,
        }));

        // Initialize Daily Data (Current Month)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        const dData = Array.from({ length: daysInMonth }, (_, i) => ({
          name: (i + 1).toString(),
          salesCount: 0,
          salesAmount: 0,
        }));

        salesInvoices.forEach((inv) => {
          const d = new Date(inv.createdAt);
          const amount = parseFloat(String(inv.totalAmount)) || 0;

          // Populate Monthly Data
          const monthIndex = d.getMonth();
          mData[monthIndex].salesCount++;
          mData[monthIndex].salesAmount += amount;

          // Populate Daily Data (only for current month/year)
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            const dayIndex = d.getDate() - 1;
            if (dData[dayIndex]) {
              dData[dayIndex].salesCount++;
              dData[dayIndex].salesAmount += amount;
            }
          }
        });

        setMonthlyData(mData);
        setDailyData(dData);
      } catch (error) {
        console.error('Failed to fetch graph data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [propInvoices]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-card p-5 rounded-2xl shadow-sm border border-blue-100/50 flex flex-col h-[300px] w-full items-center justify-center"
          >
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ChartContainer
        title="Sales Per Month"
        color={salesColor}
        dataKeyAmount="salesAmount"
        data={monthlyData}
      />
      <ForexChartContainer
        title={`Sales Per Day (${new Date().toLocaleString('default', { month: 'short' })})`}
        color={dailyColor}
        dataKeyAmount="salesAmount"
        data={dailyData}
      />
    </div>
  );
}
