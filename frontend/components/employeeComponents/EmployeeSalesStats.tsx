'use client';

import React, { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { getInvoiceStats } from '@/lib/invoice';

export default function EmployeeSalesStats() {
  const [stats, setStats] = useState<Record<string, number>>({
    SALE: 0,
    RENT: 0,
    LEASE: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getInvoiceStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch invoice stats:', error);
        // Silent fail or toast
        // toast.error('Failed to load stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const totalSales = stats.SALE + stats.RENT + stats.LEASE;

  const cards = [
    {
      title: 'Total Sales',
      value: loading ? '...' : totalSales.toLocaleString(),
      subtitle: 'Across all types',
    },
    {
      title: 'Rent',
      value: loading ? '...' : stats.RENT.toLocaleString(),
      subtitle: 'Active rentals',
    },
    {
      title: 'Lease',
      value: loading ? '...' : stats.LEASE.toLocaleString(),
      subtitle: 'Active leases',
    },
    {
      title: 'Sale',
      value: loading ? '...' : stats.SALE.toLocaleString(),
      subtitle: 'Direct sales',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      {cards.map((c) => (
        <StatCard key={c.title} title={c.title} value={c.value} subtitle={c.subtitle} />
      ))}
    </div>
  );
}
