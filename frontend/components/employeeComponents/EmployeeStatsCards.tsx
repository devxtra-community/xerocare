'use client';

import React, { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { getInvoiceStats } from '@/lib/invoice';
import { getUserFromToken } from '@/lib/auth';
import { EmployeeJob } from '@/lib/employeeJob';

export default function EmployeeStatsCards() {
  const [stats, setStats] = useState({
    SALE: 0,
    RENT: 0,
    LEASE: 0,
  });
  const [isRentLeaseEmployee, setIsRentLeaseEmployee] = useState(false);

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

    const user = getUserFromToken();
    setIsRentLeaseEmployee(user?.employeeJob === EmployeeJob.RENT_LEASE);
  }, []);

  const totalOrders = stats.SALE + stats.RENT + stats.LEASE;

  const allCards = [
    { title: 'Total Orders', value: totalOrders.toString(), subtitle: 'All time' },
    { title: 'Sales', value: stats.SALE.toString(), subtitle: 'Total sales' },
    { title: 'Rent', value: stats.RENT.toString(), subtitle: 'Active rent orders' },
    { title: 'Lease', value: stats.LEASE.toString(), subtitle: 'Active lease orders' },
  ];

  // Filter out Sales card for RENT_LEASE employees
  const cards = isRentLeaseEmployee ? allCards.filter((card) => card.title !== 'Sales') : allCards;

  // Adjust grid layout based on number of cards
  const gridCols = cards.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4';

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols} gap-2 sm:gap-3 md:gap-4`}>
      {cards.map((c) => (
        <StatCard key={c.title} title={c.title} value={c.value} subtitle={c.subtitle} />
      ))}
    </div>
  );
}
