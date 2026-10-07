'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';

const agingData = [
  { bucket: 'Current', amount: 42000, color: 'bg-success', percentage: 55 },
  { bucket: '1–30 Days', amount: 18000, color: 'bg-primary', percentage: 24 },
  { bucket: '31–60 Days', amount: 9500, color: 'bg-warning/20', percentage: 12 },
  { bucket: '61–90 Days', amount: 4200, color: 'bg-warning', percentage: 6 },
  { bucket: '90+ Days', amount: 2100, color: 'bg-destructive', percentage: 3 },
];

/**
 * Component visualising Accounts Receivable aging buckets.
 * Highlights total receivables and overdue amounts with risk distribution.
 */
export default function ARAgingChart() {
  const currency = useBranchCurrency();
  const totalAR = agingData.reduce((acc, curr) => acc + curr.amount, 0);
  const overdueTotal = totalAR - agingData[0].amount;

  return (
    <div className="flex flex-col h-full">
      <Card className="h-full border-border shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex justify-between items-start mb-3">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
                Receivables Risk
              </CardTitle>
              <p className="text-2xl font-bold">{formatCurrency(totalAR, currency)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-destructive">OVERDUE</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(overdueTotal, currency)}
              </p>
            </div>
          </div>
        </CardHeader>
        <div className="w-full h-auto">
          <CardContent className="pt-0">
            {/* Simplified 1-Line Distribution Bar */}
            <div className="h-3 w-full flex rounded-full overflow-hidden bg-muted mb-4">
              {agingData.map((item) => (
                <div
                  key={item.bucket}
                  style={{ width: `${item.percentage}%` }}
                  className={`${item.color} h-full transition-all hover:opacity-80 cursor-help`}
                  title={`${item.bucket}: ${formatCurrency(item.amount, currency)}`}
                />
              ))}
            </div>

            {/* Actionable Legend List */}
            <div className="space-y-3">
              {agingData.map((item) => (
                <div key={item.bucket} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-sm font-medium text-foreground">{item.bucket}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      {formatCurrency(item.amount, currency)}
                    </span>
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 2026 ERP Action Point */}
            <div className="mt-3 p-2 bg-muted/50 rounded-lg border border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                9 accounts are over 60 days.
              </span>
              <Link href="/finance/ar/invoices">
                <button className="text-xs font-bold text-primary hover:underline">
                  Review Collections
                </button>
              </Link>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
