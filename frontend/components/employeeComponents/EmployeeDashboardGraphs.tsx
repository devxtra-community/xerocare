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
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { getCustomers } from '@/lib/customer';
import { getMyInvoices } from '@/lib/invoice';
import { Loader2 } from 'lucide-react';
import { getUserFromToken } from '@/lib/auth';
import { EmployeeJob } from '@/lib/employeeJob';

interface ChartDataItem {
  name: string;
  value: number;
  orderCount?: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  type,
}: TooltipProps<ValueType, NameType> & { type: 'customers' | 'sales' }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataItem;
    const value = payload[0].value;

    return (
      <div className="bg-card p-3 rounded-xl shadow-lg border border-blue-100 min-w-[120px]">
        <p className="font-bold text-[#2563eb] text-[10px] mb-2 uppercase tracking-widest border-b border-blue-50 pb-1">
          {label}
        </p>
        <div className="space-y-1">
          {type === 'customers' ? (
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter flex justify-between gap-4">
              <span>Customers:</span>
              <span className="text-[#2563eb]">{value}</span>
            </p>
          ) : (
            <>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter flex justify-between gap-4">
                <span>Orders:</span>
                <span className="text-[#2563eb]">{data.orderCount || 0}</span>
              </p>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter flex justify-between gap-4">
                <span>Revenue:</span>
                <span className="text-[#2563eb]">₹{Number(value).toLocaleString()}</span>
              </p>
            </>
          )}
        </div>
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

export default function EmployeeDashboardGraphs() {
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState<ChartDataItem[]>([]);
  const [salesData, setSalesData] = useState<ChartDataItem[]>([]);
  const [rentData, setRentData] = useState<ChartDataItem[]>([]);
  const [leaseData, setLeaseData] = useState<ChartDataItem[]>([]);
  const [isRentLeaseEmployee, setIsRentLeaseEmployee] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch customers and invoices in parallel
        const [customers, invoices] = await Promise.all([getCustomers(), getMyInvoices()]);

        const salesInvoices = invoices.filter((inv) => inv.saleType === 'SALE');
        const rentInvoices = invoices.filter((inv) => inv.saleType === 'RENT');
        const leaseInvoices = invoices.filter((inv) => inv.saleType === 'LEASE');

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

        const custData = months.map((name) => ({ name, value: 0 }));
        const saleData = months.map((name) => ({ name, value: 0, orderCount: 0 }));
        const rntData = months.map((name) => ({ name, value: 0, orderCount: 0 }));
        const lseData = months.map((name) => ({ name, value: 0, orderCount: 0 }));

        // Populate Customer Data
        customers.forEach((customer) => {
          const monthIndex = new Date(customer.createdAt).getMonth();
          custData[monthIndex].value++;
        });

        // Populate Sales Data
        salesInvoices.forEach((inv) => {
          const monthIndex = new Date(inv.createdAt).getMonth();
          const amount = parseFloat(String(inv.totalAmount)) || 0;
          saleData[monthIndex].value += amount;
          saleData[monthIndex].orderCount!++;
        });

        // Populate Rent Data
        rentInvoices.forEach((inv) => {
          const monthIndex = new Date(inv.createdAt).getMonth();
          const amount = parseFloat(String(inv.totalAmount)) || 0;
          rntData[monthIndex].value += amount;
          rntData[monthIndex].orderCount!++;
        });

        // Populate Lease Data
        leaseInvoices.forEach((inv) => {
          const monthIndex = new Date(inv.createdAt).getMonth();
          const amount = parseFloat(String(inv.totalAmount)) || 0;
          lseData[monthIndex].value += amount;
          lseData[monthIndex].orderCount!++;
        });

        setCustomerData(custData);
        setSalesData(saleData);
        setRentData(rntData);
        setLeaseData(lseData);
      } catch (error) {
        console.error('Failed to fetch dashboard graph data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const user = getUserFromToken();
    setIsRentLeaseEmployee(user?.employeeJob === EmployeeJob.RENT_LEASE);
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

  // Define charts to show based on employee job type
  const charts = isRentLeaseEmployee
    ? [
        { title: 'Rent Revenue Per Month', data: rentData, type: 'sales' },
        { title: 'Lease Revenue Per Month', data: leaseData, type: 'sales' },
      ]
    : [
        { title: 'Customers Per Month', data: customerData, type: 'customers' },
        { title: 'Sales Per Month', data: salesData, type: 'sales' },
      ];

  return (
    <div className="space-y-3">
      <h3 className="text-lg sm:text-xl font-bold text-primary">Performance Analytics</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {charts.map((chart) => (
          <ChartCard key={chart.title} title={chart.title}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart.data} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
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
                  tickFormatter={
                    chart.type === 'sales'
                      ? (val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`
                      : undefined
                  }
                />
                <Tooltip
                  content={<CustomTooltip type={chart.type as 'customers' | 'sales'} />}
                  cursor={{ fill: '#f1f5f9', opacity: 0.4 }}
                />
                <Bar
                  dataKey="value"
                  fill={chart.type === 'customers' ? '#3b82f6' : '#2563eb'}
                  radius={[4, 4, 0, 0]}
                  barSize={10}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ))}
      </div>
    </div>
  );
}
