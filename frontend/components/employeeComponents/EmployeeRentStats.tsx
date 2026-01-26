'use client';

import React from 'react';
import StatCard from '@/components/StatCard';
import { Invoice } from '@/lib/invoice';

interface EmployeeRentStatsProps {
  invoices: Invoice[];
}

export default function EmployeeRentStats({ invoices }: EmployeeRentStatsProps) {
  const rentInvoices = invoices.filter((inv) => inv.saleType === 'RENT');

  const cards = [
    {
      title: 'Total Rentals',
      value: rentInvoices.length.toString(),
    },
    {
      title: 'Active Rent',
      value: rentInvoices.filter((inv) => inv.status === 'PAID').length.toString(),
    },
    {
      title: 'Pending Rent',
      value: rentInvoices.filter((inv) => inv.status === 'PENDING').length.toString(),
    },
    {
      title: 'Total Revenue (Rent)',
      value: `₹${rentInvoices
        .reduce((sum, inv) => (inv.status === 'PAID' ? sum + inv.totalAmount : sum), 0)
        .toLocaleString()}`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      {cards.map((c) => (
        <StatCard key={c.title} title={c.title} value={c.value} />
      ))}
    </div>
  );
}
