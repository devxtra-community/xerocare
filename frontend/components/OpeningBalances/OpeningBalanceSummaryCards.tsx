'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Landmark, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { OpeningBalanceEntry } from '@/lib/openingBalance';

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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card className="rounded-2xl border-none shadow-sm bg-card overflow-hidden">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium">
              Total Migrated Value
            </p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
              QAR{' '}
              {totalOriginal.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">From all live contracts & debts</p>
          </div>
          <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500">
            <Landmark className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-sm bg-card overflow-hidden">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium">
              Remaining Outstanding
            </p>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-500 mt-1">
              QAR{' '}
              {totalRemaining.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">To be collected post go-live</p>
          </div>
          <div className="p-3 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-500">
            <AlertCircle className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-sm bg-card overflow-hidden">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium">
              Total Paid / Settled
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-500 mt-1">
              QAR{' '}
              {(totalPaid + totalCollectedSinceGoLive).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              QAR {totalCollectedSinceGoLive.toLocaleString()} collected since go-live
            </p>
          </div>
          <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500">
            <CheckCircle className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-sm bg-card overflow-hidden">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium">Active Migrations</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
              {totalActiveCount} Entries
            </h3>
            <p className="text-xs text-muted-foreground mt-1">{totalSettledCount} fully settled</p>
          </div>
          <div className="p-3 rounded-full bg-slate-50 dark:bg-slate-900/20 text-slate-500">
            <FileText className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
