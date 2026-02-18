'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

const agingData = [
  { bucket: 'Current', amount: 42000, color: 'bg-emerald-500', percentage: 55 },
  { bucket: '1–30 Days', amount: 18000, color: 'bg-blue-500', percentage: 24 },
  { bucket: '31–60 Days', amount: 9500, color: 'bg-amber-400', percentage: 12 },
  { bucket: '61–90 Days', amount: 4200, color: 'bg-orange-500', percentage: 6 },
  { bucket: '90+ Days', amount: 2100, color: 'bg-rose-500', percentage: 3 },
];

/**
 * Component visualising Accounts Receivable aging buckets.
 * Highlights total receivables and overdue amounts with risk distribution.
 */
export default function ARAgingChart() {
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
              <p className="text-2xl font-bold">AED {totalAR.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-rose-600">OVERDUE</p>
              <p className="text-lg font-bold text-slate-700">
                AED {overdueTotal.toLocaleString()}
              </p>
            </div>
          </div>
        </CardHeader>
        <div className="w-full h-auto">
          <CardContent className="pt-0">
            {/* Simplified 1-Line Distribution Bar */}
            <div className="h-3 w-full flex rounded-full overflow-hidden bg-slate-100 mb-4">
              {agingData.map((item) => (
                <div
                  key={item.bucket}
                  style={{ width: `${item.percentage}%` }}
                  className={`${item.color} h-full transition-all hover:opacity-80 cursor-help`}
                  title={`${item.bucket}: AED ${item.amount.toLocaleString()}`}
                />
              ))}
            </div>

            {/* Actionable Legend List */}
            <div className="space-y-3">
              {agingData.map((item) => (
                <div key={item.bucket} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-sm font-medium text-slate-600">{item.bucket}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      AED {item.amount.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 w-8 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 2026 ERP Action Point */}
            <div className="mt-3 p-2 bg-muted/50 rounded-lg border border-slate-100 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                9 accounts are over 60 days.
              </span>
              <Link href="/finance/ar/invoices">
                <button className="text-xs font-bold text-blue-600 hover:underline">
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
