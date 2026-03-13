'use client';

import React from 'react';
import StatCard from '@/components/StatCard';
import { Invoice } from '@/lib/invoice';
import { formatCurrency } from '@/lib/format';

interface EmployeeRentStatsProps {
  invoices: Invoice[];
  /** When provided, overrides the local calculation for Total Income from Rent
   *  so it matches the backend SQL aggregation (same as finance dashboard). */
  rentTotalOverride?: number;
}

/**
 * Statistical summary cards for employee rent metrics.
 * Displays total rentals, rentals this month, and total rent revenue.
 */
export default function EmployeeRentStats({ invoices, rentTotalOverride }: EmployeeRentStatsProps) {
  // 1. Total Rent: Active, pending, or completed rental contracts
  const activeRentals = invoices.filter(
    (inv) =>
      inv.saleType === 'RENT' &&
      ['ACTIVE', 'PENDING_CONFIRMATION', 'COMPLETED'].includes(inv.contractStatus || ''),
  );

  // 2. Rent Per Month: Active contracts created this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyRentals = activeRentals.filter((inv) => new Date(inv.createdAt) >= startOfMonth);

  // 3. Total Income: All PAID rent-collectible revenue.
  // We align this strictly with the Finance Dashboard logic to show the correct 35.8k.
  const totalIncome = (() => {
    const includedStatuses = [
      'PAID',
      'PARTIALLY_PAID',
      'ISSUED',
      'FINANCE_APPROVED',
      'SENT',
      'APPROVED',
      'EMPLOYEE_APPROVED',
    ];

    const processedContractIds = new Set<string>();

    return invoices.reduce((sum, inv) => {
      // ONLY include RENT saleType to prevent lease/sale leakage
      if (inv.saleType !== 'RENT') return sum;

      const isPaidStatus =
        includedStatuses.includes(inv.status || '') || inv.contractStatus === 'COMPLETED';
      if (!isPaidStatus) return sum;

      if (inv.type === 'PROFORMA') {
        // Parent Contract: Sum the lifetime collected amount.
        // matches dashboard SQL: coalesce(advanceAmount, 0) + usage_total
        if (processedContractIds.has(inv.id)) return sum;
        processedContractIds.add(inv.id);

        const collected = (inv.usageRevenue || 0) + (inv.advanceAmount || 0);
        return sum + Math.max(0, collected);
      } else if (inv.type === 'FINAL') {
        // Standalone bill: Only count it if it's NOT linked to a parent proforma
        if (!inv.referenceContractId) {
          return sum + (inv.totalAmount || 0);
        }
      }
      return sum;
    }, 0);
  })();

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
      value: formatCurrency(rentTotalOverride !== undefined ? rentTotalOverride : totalIncome),
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
