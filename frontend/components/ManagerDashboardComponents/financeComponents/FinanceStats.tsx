'use client';

import React, { useState, useEffect } from 'react';
import StatCard from '@/components/StatCard';
import { getBranchFinanceStats } from '@/lib/invoice';
import { formatCurrency } from '@/lib/format';

interface FinanceStatsProps {
  selectedYear?: number | 'all';
}

/**
 * Component displaying key financial statistics cards.
 * Shows Total Revenue, Expenses, Net Profit, and Outstanding Receivables.
 * Provides a high-level financial overview.
 */
export default function FinanceStats({ selectedYear }: FinanceStatsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getBranchFinanceStats(selectedYear === 'all' ? undefined : selectedYear);

        setStats({
          totalRevenue: data.totalRevenue,
          totalExpenses: data.totalExpenses,
          netProfit: data.netProfit,
        });
      } catch (error) {
        console.error('Failed to fetch finance stats', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedYear]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 md:gap-4">
      <StatCard
        title="Total Revenue"
        value={loading ? '...' : formatCurrency(stats.totalRevenue)}
        subtitle={selectedYear === 'all' ? 'All Time' : `${selectedYear} Total`}
      />
      <StatCard
        title="Total Expenses"
        value={loading ? '...' : formatCurrency(stats.totalExpenses)}
        subtitle="Purchase Cost (Lots)"
      />
      <StatCard
        title="Net Profit"
        value={loading ? '...' : formatCurrency(stats.netProfit)}
        subtitle={`Net Margin: ${stats.totalRevenue > 0 ? ((stats.netProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%`}
      />
    </div>
  );
}
