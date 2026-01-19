'use client';

import React from 'react';
import StatCard from '@/components/StatCard';
import { Invoice } from '@/lib/invoice';

interface EmployeeLeaseStatsProps {
  invoices: Invoice[];
}

export default function EmployeeLeaseStats({ invoices }: EmployeeLeaseStatsProps) {
  const leaseInvoices = invoices.filter((inv) => inv.saleType === 'LEASE');

  const cards = [
    {
      title: 'Total Leases',
      value: leaseInvoices.length.toString(),
    },
    {
      title: 'Active Lease',
      value: leaseInvoices.filter((inv) => inv.status === 'PAID').length.toString(),
    },
    {
      title: 'Pending Lease',
      value: leaseInvoices.filter((inv) => inv.status === 'PENDING').length.toString(),
    },
    {
      title: 'Total Revenue (Lease)',
      value: `₹${leaseInvoices
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
