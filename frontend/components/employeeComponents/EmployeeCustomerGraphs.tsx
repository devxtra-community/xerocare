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
} from 'recharts';

import { getCustomers } from '@/lib/customer';
import { Loader2 } from 'lucide-react';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';

interface ChartDataItem {
  name: string;
  customers: number;
}

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card p-5 rounded-2xl shadow-sm border border-blue-100/50 flex flex-col h-[300px] w-full">
    <h4 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-6">{title}</h4>
    <div className="flex-1 w-full min-h-0">{children}</div>
  </div>
);

/**
 * Charts displaying customer acquisition trends for employees.
 * Shows new customers per month (Bar Chart) and per day for the current month (Line Chart).
 */
export default function EmployeeCustomerGraphs() {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<ChartDataItem[]>([]);
  const [dailyData, setDailyData] = useState<ChartDataItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const customers = await getCustomers();

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
          customers: 0,
        }));

        // Initialize Daily Data (Current Month)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        const dData = Array.from({ length: daysInMonth }, (_, i) => ({
          name: (i + 1).toString(),
          customers: 0,
        }));

        customers.forEach((customer) => {
          const d = new Date(customer.createdAt);

          // Populate Monthly Data
          const monthIndex = d.getMonth();
          mData[monthIndex].customers++;

          // Populate Daily Data (only for current month/year)
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            const dayIndex = d.getDate() - 1;
            if (dData[dayIndex]) {
              dData[dayIndex].customers++;
            }
          }
        });

        setMonthlyData(mData);
        setDailyData(dData);
      } catch (error) {
        console.error('Failed to fetch customer graph data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      {/* 1. Customers Per Month (Bar) */}
      <ChartCard title="Customers Per Month">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
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
            <Tooltip content={<ChartTooltipContent />} cursor={{ fill: '#f1f5f9', opacity: 0.4 }} />
            <Bar dataKey="customers" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={10} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 2. Customers Per Day (Line) */}
      <ChartCard
        title={`Customers Per Day (${new Date().toLocaleString('default', { month: 'short' })})`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
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
              domain={['auto', 'auto']}
            />
            <Tooltip
              content={<ChartTooltipContent />}
              cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Line
              type="monotone"
              dataKey="customers"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--primary)', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, fill: 'var(--primary)', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
