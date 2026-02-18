'use client';

import React from 'react';
import StatCard from '@/components/StatCard';
import { Invoice } from '@/lib/invoice';

interface EmployeeRentStatsProps {
  invoices: Invoice[];
}

/**
 * Statistical summary cards for employee rent metrics.
 * Displays total rentals, rentals this month, and total rent revenue.
 */
export default function EmployeeRentStats({ invoices }: EmployeeRentStatsProps) {
  // 1. Total Rent: Only active rental contracts (PROFORMA)
  const activeRentals = invoices.filter(
    (inv) => inv.saleType === 'RENT' && inv.contractStatus === 'ACTIVE',
  );

  // 2. Rent Per Month: Active contracts created this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyRentals = activeRentals.filter((inv) => new Date(inv.createdAt) >= startOfMonth);

  // 3. Total Income: All PAID rent-related invoices (including security deposits and monthly bills)
  const totalIncome = invoices.reduce(
    (sum, inv) =>
      inv.saleType === 'RENT' && (inv.status === 'PAID' || inv.status === 'PARTIALLY_PAID')
        ? sum + (inv.totalAmount || 0)
        : sum,
    0,
  );

  const cards = [
    {
      title: 'Total Rent',
      value: activeRentals.length.toString(),
      subtitle: 'Active contracts',
    },
    {
      title: 'Rent Per Month',
      value: monthlyRentals.length.toString(),
      subtitle: 'New this month',
    },
    {
      title: 'Total Income from Rent',
      value: `₹${totalIncome.toLocaleString()}`,
      subtitle: 'Collected revenue',
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
