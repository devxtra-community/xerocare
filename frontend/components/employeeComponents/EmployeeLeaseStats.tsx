'use client';

import React, { useState, useEffect } from 'react';
import StatCard from '@/components/StatCard';
import { Invoice, getMyInvoices } from '@/lib/invoice';

interface EmployeeLeaseStatsProps {
  invoices?: Invoice[];
}

export default function EmployeeLeaseStats({ invoices: propInvoices }: EmployeeLeaseStatsProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (propInvoices) {
        setInvoices(propInvoices);
        setLoading(false);
        return;
      }
      try {
        const data = await getMyInvoices();
        setInvoices(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [propInvoices]);

  const leaseInvoices = invoices.filter((inv) => inv.saleType === 'LEASE');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyLease = leaseInvoices.filter((inv) => new Date(inv.createdAt) >= startOfMonth);

  // Total Revenue from Lease (sum of PAID lease invoices)
  const totalRevenue = leaseInvoices.reduce(
    (sum, inv) => (inv.status === 'PAID' ? sum + (inv.totalAmount || 0) : sum),
    0,
  );

  const cards = [
    {
      title: 'Total Lease',
      value: loading ? '...' : leaseInvoices.length.toString(),
      subtitle: 'All time leases',
    },
    {
      title: 'Lease Per Month',
      value: loading ? '...' : monthlyLease.length.toString(),
      subtitle: 'Current month',
    },
    {
      title: 'Total Revenue from Lease',
      value: loading ? '...' : `₹${totalRevenue.toLocaleString()}`,
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
