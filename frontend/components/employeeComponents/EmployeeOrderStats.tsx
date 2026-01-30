'use client';

import React, { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { getInvoiceStats } from '@/lib/invoice'; // Use the stats endpoint
import { Loader2 } from 'lucide-react';

export default function EmployeeOrderStats() {
  const [stats, setStats] = useState({
    total: 0,
    sale: 0,
    rent: 0,
    lease: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getInvoiceStats();
        // data matches { SALE: number, RENT: number, LEASE: number }

        const total = (data.SALE || 0) + (data.RENT || 0) + (data.LEASE || 0);

        setStats({
          total,
          sale: data.SALE || 0,
          rent: data.RENT || 0,
          lease: data.LEASE || 0,
        });
      } catch (error) {
        console.error('Failed to fetch order stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    {
      title: 'Total Orders',
      value: loading ? '...' : stats.total.toLocaleString(),
      subtitle: 'All time orders',
    },
    {
      title: 'Sales',
      value: loading ? '...' : stats.sale.toLocaleString(),
      subtitle: 'Direct sales',
    },
    {
      title: 'Rent',
      value: loading ? '...' : stats.rent.toLocaleString(),
      subtitle: 'Rental agreements',
    },
    {
      title: 'Lease',
      value: loading ? '...' : stats.lease.toLocaleString(),
      subtitle: 'Lease contracts',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white p-4 rounded-xl shadow-sm h-32 flex items-center justify-center"
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
