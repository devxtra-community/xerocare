'use client';
import { useState, useEffect } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { getInvoices, Invoice } from '@/lib/invoice';

// Removed unused static data

export default function SalesChart() {
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<{ month: string; sales: number; fullMonth: string }[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const invoices = await getInvoices();

        // Initialize all months with 0
        const monthlyData = [
          { month: 'Jan', sales: 0, fullMonth: 'January' },
          { month: 'Feb', sales: 0, fullMonth: 'February' },
          { month: 'Mar', sales: 0, fullMonth: 'March' },
          { month: 'Apr', sales: 0, fullMonth: 'April' },
          { month: 'May', sales: 0, fullMonth: 'May' },
          { month: 'Jun', sales: 0, fullMonth: 'June' },
          { month: 'Jul', sales: 0, fullMonth: 'July' },
          { month: 'Aug', sales: 0, fullMonth: 'August' },
          { month: 'Sep', sales: 0, fullMonth: 'September' },
          { month: 'Oct', sales: 0, fullMonth: 'October' },
          { month: 'Nov', sales: 0, fullMonth: 'November' },
          { month: 'Dec', sales: 0, fullMonth: 'December' },
        ];

        // Filter for sales invoices from the current year
        const currentYear = new Date().getFullYear();
        invoices.forEach((inv: Invoice) => {
          if (inv.saleType === 'SALE') {
            const date = new Date(inv.createdAt);
            if (date.getFullYear() === currentYear) {
              const monthIndex = date.getMonth(); // 0-11
              monthlyData[monthIndex].sales += Number(inv.totalAmount) || 0;
            }
          }
        });

        setData(monthlyData);
      } catch (error) {
        console.error('Failed to fetch sales chart data', error);
      }
    };
    fetchSalesData();
  }, []);

  return (
    <div className="rounded-2xl bg-white h-[260px] w-full shadow-sm flex flex-col p-3">
      <div className="flex flex-row items-center justify-between pb-2">
        <p className="text-xs text-gray-600">Monthly Sales ({new Date().getFullYear()})</p>

        <div className="flex gap-1.5 text-[10px]">
          {['1W', '1M', '3M', '1Y'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                selectedPeriod === period
                  ? 'bg-primary text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, left: 0, right: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.3} />

              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tickMargin={6}
                tick={{ fill: '#6b7280', fontSize: 10 }}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v / 1000}k`}
                tickMargin={6}
                // allowDecimals={false}
                tick={{ fill: '#6b7280', fontSize: 10 }}
              />

              <Tooltip
                contentStyle={{ fontSize: 12 }}
                labelStyle={{ color: '#1e3a8a' }}
                formatter={(value: number) => [`${value.toFixed(2)} AZN`, 'Sales']}
              />

              <Area
                type="monotone"
                dataKey="sales"
                stroke="#1d4ed8"
                strokeWidth={2}
                fill="url(#salesGradient)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
