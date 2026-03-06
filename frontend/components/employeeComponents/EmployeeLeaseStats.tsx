'use client';

import React, { useState, useEffect } from 'react';
import StatCard from '@/components/StatCard';
import { Invoice, getMyInvoices, getInvoiceHistory } from '@/lib/invoice';
import { formatCurrency } from '@/lib/format';

interface EmployeeLeaseStatsProps {
  invoices?: Invoice[];
}

/**
 * Statistical summary cards for employee lease metrics.
 * Displays total leases, leases this month, and total lease revenue.
 */
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

  // 1. Total Lease: All lease contracts (active, completed, pending, etc.)
  const allLeases = invoices.filter((inv) => inv.saleType === 'LEASE');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyLeases = allLeases.filter((inv) => new Date(inv.createdAt) >= startOfMonth);

  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [loadingRevenue, setLoadingRevenue] = useState(true);

  // Fetch EMI history and calculate total revenue
  useEffect(() => {
    const calculateRevenue = async () => {
      try {
        setLoadingRevenue(true);
        // Fetch all generated EMI final invoices for leases (branch-wide)
        const allEmis = await getInvoiceHistory('LEASE');

        const revenueStatuses = [
          'PAID',
          'PARTIALLY_PAID',
          'ISSUED',
          'FINANCE_APPROVED',
          'ACTIVE_LEASE',
          'EMPLOYEE_APPROVED',
          'APPROVED',
          'COMPLETED',
        ];

        let revenue = 0;

        // 1. Invoices Prop (Mainly Active/Pending Contracts)
        const relevantContractIds = new Set(invoices.map((i) => i.id));
        invoices.forEach((inv) => {
          if (inv.saleType === 'LEASE' && revenueStatuses.includes(inv.status)) {
            // Revenue = Advance Collected + All Monthly Collections (usageRevenue)
            revenue += Number(inv.advanceAmount || 0) + Number(inv.usageRevenue || 0);
          }
        });

        // 2. allEmis (Completed Contracts and separate EMI invoices)
        allEmis.forEach((emi) => {
          if (!relevantContractIds.has(emi.id)) {
            if (emi.saleType === 'LEASE' && revenueStatuses.includes(emi.status)) {
              if (emi.referenceContractId) {
                // Separate EMI Invoice
                revenue += Number(emi.totalAmount || 0);
              } else {
                // Completed/Consolidated Lease Contract
                revenue +=
                  Number(emi.advanceAmount || 0) + Number(emi.usageRevenue || emi.totalAmount || 0);
              }
            }
          }
        });

        setTotalRevenue(revenue);
      } catch (err) {
        console.error('Failed to fetch lease EMI history:', err);
      } finally {
        setLoadingRevenue(false);
      }
    };

    if (!loading) {
      calculateRevenue();
    }
  }, [invoices, loading]);

  const cards = [
    {
      title: 'Total Lease',
      value: loading ? '...' : allLeases.length.toString(),
      subtitle: 'All contracts',
    },
    {
      title: 'Lease Per Month',
      value: loading ? '...' : monthlyLeases.length.toString(),
      subtitle: 'New this month',
    },
    {
      title: 'Total Revenue from Lease',
      value: loading || loadingRevenue ? '...' : formatCurrency(totalRevenue),
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
