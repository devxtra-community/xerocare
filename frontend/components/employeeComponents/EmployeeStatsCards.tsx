'use client';

import React, { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { getInvoiceStats } from '@/lib/invoice';

export default function EmployeeStatsCards() {
  const [stats, setStats] = useState({
    SALE: 0,
    RENT: 0,
    LEASE: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getInvoiceStats();
        setStats({
          SALE: data.SALE || 0,
          RENT: data.RENT || 0,
          LEASE: data.LEASE || 0,
        });
      } catch (error) {
        console.error('Failed to fetch invoice stats', error);
      }
    };
    fetchStats();
  }, []);

  const totalOrders = stats.SALE + stats.RENT + stats.LEASE;

  const cards = [
    { title: 'Total Orders', value: totalOrders.toString(), subtitle: 'All time' },
    { title: 'Sales', value: stats.SALE.toString(), subtitle: 'Total sales' },
    { title: 'Rent', value: stats.RENT.toString(), subtitle: 'Active rent orders' },
    { title: 'Lease', value: stats.LEASE.toString(), subtitle: 'Active lease orders' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      {cards.map((c) => (
        <StatCard key={c.title} title={c.title} value={c.value} subtitle={c.subtitle} />
      ))}
    </div>
  );
}
