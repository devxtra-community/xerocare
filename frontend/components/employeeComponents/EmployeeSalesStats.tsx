'use client';

import React, { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { getMyInvoices, Invoice } from '@/lib/invoice';
import { Loader2 } from 'lucide-react';

interface EmployeeSalesStatsProps {
  invoices?: Invoice[];
  selectedYear?: number | 'all';
}

/**
 * Statistical summary cards for employee sales metrics.
 * Displays total sales count, sales this month, and total revenue.
 */
export default function EmployeeSalesStats({
  invoices: propInvoices,
  selectedYear,
}: EmployeeSalesStatsProps) {
  const [stats, setStats] = useState({
    totalOrders: 0,
    salesCount: 0,
    salesMonth: 0,
    totalAmount: 0,
    rejectedCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        let invoices = propInvoices;
        if (!invoices) {
          invoices = await getMyInvoices();
        }

        if (selectedYear && selectedYear !== 'all') {
          invoices = invoices.filter(
            (inv) => new Date(inv.createdAt).getFullYear() === selectedYear,
          );
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const totalOrders = invoices.length;
        const salesInvoices = invoices.filter((inv) => inv.saleType === 'SALE');

        // Filter out rejected sales for stats and graphs
        const approvedSalesInvoices = salesInvoices.filter((inv) => inv.status !== 'REJECTED');
        const rejectedSalesInvoices = salesInvoices.filter((inv) => inv.status === 'REJECTED');

        const salesCount = approvedSalesInvoices.length;
        const salesMonth = approvedSalesInvoices.filter(
          (inv) => new Date(inv.createdAt) >= startOfMonth,
        ).length;
        const rejectedCount = rejectedSalesInvoices.length;

        // Parse float to avoid string concatenation if API returns strings
        const totalAmount = approvedSalesInvoices.reduce(
          (sum, inv) => sum + (parseFloat(String(inv.totalAmount)) || 0),
          0,
        );

        setStats({
          totalOrders,
          salesCount,
          salesMonth,
          totalAmount,
          rejectedCount,
        });
      } catch (error) {
        console.error('Failed to fetch sales stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [propInvoices]);

  const cards = [
    {
      title: 'Total Sales',
      value: loading ? '...' : stats.salesCount.toLocaleString(),
      subtitle: 'All time sales count',
    },
    {
      title: 'Sales This Month',
      value: loading ? '...' : stats.salesMonth.toLocaleString(),
      subtitle: 'Current month count',
    },
    {
      title: 'Total Sales Amount',
      value: loading
        ? '...'
        : `₹${
            stats.totalAmount >= 1000
              ? (stats.totalAmount / 1000).toFixed(1) + ' k'
              : stats.totalAmount.toLocaleString()
          }`,
      subtitle: 'Total revenue generated',
    },
    {
      title: 'Rejected Sales',
      value: loading ? '...' : stats.rejectedCount.toLocaleString(),
      subtitle: 'Finance rejected count',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-card p-4 rounded-xl shadow-sm h-32 flex items-center justify-center"
          >
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      {cards.map((c) => (
        <StatCard key={c.title} title={c.title} value={c.value} subtitle={c.subtitle} />
      ))}
    </div>
  );
}
