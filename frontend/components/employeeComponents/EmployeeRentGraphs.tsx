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
  TooltipProps,
  AreaChart,
  Area,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { getMyInvoices, Invoice } from '@/lib/invoice';
import { Loader2 } from 'lucide-react';

interface ChartDataItem {
  name: string;
  count: number;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div className="bg-card p-3 rounded-xl shadow-lg border border-blue-100 min-w-[120px]">
        <p className="font-bold text-[#2563eb] text-[10px] mb-2 uppercase tracking-widest border-b border-blue-50 pb-1">
          {label}
        </p>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter flex justify-between gap-4">
          <span>Rentals:</span>
          <span className="text-[#2563eb]">{value}</span>
        </p>
      </div>
    );
  }
  return null;
};

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card p-5 rounded-2xl shadow-sm border border-blue-100/50 flex flex-col h-[300px] w-full">
    <h4 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-8">{title}</h4>
    <div className="flex-1 w-full min-h-0">{children}</div>
  </div>
);

interface EmployeeRentGraphsProps {
  invoices?: Invoice[];
}

/**
 * Analytics charts for employee rental performance.
 * Displays number of rentals generated per month and per day.
 */
export default function EmployeeRentGraphs({ invoices: propInvoices }: EmployeeRentGraphsProps) {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<ChartDataItem[]>([]);
  const [dailyData, setDailyData] = useState<ChartDataItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let invoices = propInvoices;
        if (!invoices) {
          invoices = await getMyInvoices();
        }
        const rentInvoices = invoices.filter((inv) => inv.saleType === 'RENT');

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

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
        const mData = months.map((name) => ({ name, count: 0 }));

        // Initialize Daily Data (for current month)
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const dData = Array.from({ length: daysInMonth }, (_, i) => ({
          name: `${i + 1}`,
          count: 0,
        }));

        rentInvoices.forEach((inv) => {
          const date = new Date(inv.createdAt);

          // Monthly logic (current year)
          if (date.getFullYear() === currentYear) {
            mData[date.getMonth()].count++;
          }

          // Daily logic (current month and year)
          if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
            dData[date.getDate() - 1].count++;
          }
        });

        setMonthlyData(mData);
        setDailyData(dData);
      } catch (error) {
        console.error('Failed to fetch rent graph data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [propInvoices]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
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
    <div className="space-y-4 pb-6">
      <h3 className="text-lg sm:text-xl font-bold text-primary">Rent Analytics</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rent Per Month */}
        <ChartCard title="Rent Per Month">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
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
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.4 }} />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Rent Per Day */}
        <ChartCard title="Rent Per Day (Current Month)">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
              <defs>
                <linearGradient id="colorCountRent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                interval={Math.floor(dailyData.length / 10)}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3b82f6', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCountRent)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
