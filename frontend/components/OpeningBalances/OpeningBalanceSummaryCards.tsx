'use client';

import React from 'react';
import StatCard from '@/components/StatCard';
import { OpeningBalanceEntry } from '@/lib/openingBalance';

import { getActiveCurrency } from '@/lib/currency';
interface SummaryCardsProps {
  entries: OpeningBalanceEntry[];
}

export default function OpeningBalanceSummaryCards({ entries }: SummaryCardsProps) {
  const totalOriginal = entries.reduce(
    (sum, entry) => sum + Number(entry.originalTotalAmount || 0),
    0,
  );
  const totalRemaining = entries.reduce(
    (sum, entry) => sum + Number(entry.remainingBalance || 0),
    0,
  );
  const totalPaid = entries.reduce((sum, entry) => sum + Number(entry.alreadyPaidAmount || 0), 0);
  const totalCollectedSinceGoLive = entries.reduce((sum, entry) => {
    const collected = Number(entry.openingBalance || 0) - Number(entry.remainingBalance || 0);
    return sum + Math.max(0, collected);
  }, 0);

  const totalSettledCount = entries.filter((e) => e.isFullySettled).length;
  const totalActiveCount = entries.length - totalSettledCount;

  return (
    <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:gap-4 lg:grid-cols-4">
      <StatCard
        title="Total Migrated Value"
        value={`${getActiveCurrency()} ${totalOriginal.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`}
        subtitle="From all live contracts & debts"
      />
      <StatCard
        title="Remaining Outstanding"
        value={`${getActiveCurrency()} ${totalRemaining.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`}
        subtitle="To be collected post go-live"
        tone="warning"
      />
      <StatCard
        title="Total Paid / Settled"
        value={`${getActiveCurrency()} ${(totalPaid + totalCollectedSinceGoLive).toLocaleString(
          'en-US',
          { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        )}`}
        subtitle={`${getActiveCurrency()} ${totalCollectedSinceGoLive.toLocaleString()} collected since go-live`}
        tone="positive"
      />
      <StatCard
        title="Active Migrations"
        value={`${totalActiveCount} Entries`}
        subtitle={`${totalSettledCount} fully settled`}
      />
    </div>
  );
}
