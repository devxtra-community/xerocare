'use client';

import React, { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { getMyInvoices } from '@/lib/invoice';
import { Loader2 } from 'lucide-react';

import { Invoice } from '@/lib/invoice';

interface EmployeeOrderStatsProps {
  invoices?: Invoice[];
}

export default function EmployeeOrderStats({ invoices: propInvoices }: EmployeeOrderStatsProps) {
  const [stats, setStats] = useState({
    total: 0,
    month: 0,
    today: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        let invoices = propInvoices;
        if (!invoices) {
          invoices = await getMyInvoices();
        }

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Filter out rejected sales
        const validInvoices = invoices.filter((inv) => inv.status !== 'REJECTED');

        const total = validInvoices.length;
        const month = validInvoices.filter((inv) => new Date(inv.createdAt) >= startOfMonth).length;
        const today = validInvoices.filter((inv) => new Date(inv.createdAt) >= startOfDay).length;

        setStats({
          total,
          month,
          today,
        });
      } catch (error) {
        console.error('Failed to fetch order stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [propInvoices]);

  const cards = [
    {
      title: 'Total Orders',
      value: loading ? '...' : stats.total.toLocaleString(),
      subtitle: 'All time orders',
    },
    {
      title: 'Orders This Month',
      value: loading ? '...' : stats.month.toLocaleString(),
      subtitle: 'Current month',
    },
    {
      title: 'Today Orders',
      value: loading ? '...' : stats.today.toLocaleString(),
      subtitle: "Today's orders",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        {[1, 2, 3].map((i) => (
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
      {cards.map((c) => (
        <StatCard key={c.title} title={c.title} value={c.value} subtitle={c.subtitle} />
      ))}
    </div>
  );
}
