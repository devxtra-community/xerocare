'use client';

import React, { useState, useEffect } from 'react';
import StatCard from '@/components/StatCard';
import { getCustomers } from '@/lib/customer';
import { Loader2 } from 'lucide-react';

export default function EmployeeCustomerStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    perMonth: 0,
    perDay: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const customers = await getCustomers();

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const today = now.toDateString();

        // Calculate stats
        const perMonth = customers.filter((customer) => {
          const createdDate = new Date(customer.createdAt);
          return (
            createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear
          );
        }).length;

        const perDay = customers.filter((customer) => {
          const createdDate = new Date(customer.createdAt);
          return createdDate.toDateString() === today;
        }).length;

        setStats({
          total: customers.length,
          perMonth,
          perDay,
        });
      } catch (error) {
        console.error('Failed to fetch customer stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white p-4 rounded-xl shadow-sm border border-blue-100/50 flex items-center justify-center h-24"
          >
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Customers',
      value: stats.total.toLocaleString(),
      subtitle: 'All time customers',
    },
    {
      title: 'Per Month',
      value: stats.perMonth.toLocaleString(),
      subtitle: `Added in ${new Date().toLocaleString('default', { month: 'long' })}`,
    },
    {
      title: 'Per Day',
      value: stats.perDay.toLocaleString(),
      subtitle: 'Added today',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
      {cards.map((c) => (
        <StatCard key={c.title} title={c.title} value={c.value} subtitle={c.subtitle} />
      ))}
    </div>
  );
}
