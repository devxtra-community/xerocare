'use client';

import React from 'react';
import StatCard from '@/components/StatCard';
import { Invoice } from '@/lib/invoice';

interface EmployeeRentStatsProps {
  invoices: Invoice[];
}

export default function EmployeeRentStats({ invoices }: EmployeeRentStatsProps) {
  const rentInvoices = invoices.filter((inv) => inv.saleType === 'RENT');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyRent = rentInvoices.filter((inv) => new Date(inv.createdAt) >= startOfMonth);

  // Total Income usually refers to paid amounts, but can also mean total billing.
  // I will use total PAID amount for "Income" as is common in finance dashboards.
  const totalIncome = rentInvoices.reduce(
    (sum, inv) => (inv.status === 'PAID' ? sum + (inv.totalAmount || 0) : sum),
    0,
  );

  const cards = [
    {
      title: 'Total Rent',
      value: rentInvoices.length.toString(),
      subtitle: 'All time rentals',
    },
    {
      title: 'Rent Per Month',
      value: monthlyRent.length.toString(),
      subtitle: 'Current month',
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
