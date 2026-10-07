'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, Wallet } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';

const apAgingData = [
  { bucket: 'Current', amount: 38000, color: 'bg-primary', percentage: 63 },
  { bucket: '1–30 Days', amount: 12000, color: 'bg-primary/20', percentage: 20 },
  { bucket: '31–60 Days', amount: 6400, color: 'bg-muted', percentage: 10 },
  { bucket: '61–90 Days', amount: 2900, color: 'bg-muted', percentage: 5 },
  { bucket: '90+ Days', amount: 1100, color: 'bg-destructive/20', percentage: 2 },
];

/**
 * Component visualising Accounts Payable aging buckets.
 * categorizes payables by overdue duration (Current, 1-30, 31-60, 61-90, 90+ days).
 */
export default function APDueAgingChart() {
  const currency = useBranchCurrency();
  const totalAP = apAgingData.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className=" p-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-card rounded-lg  border-border shadow-sm">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Accounts Payable
              </CardTitle>
              <CardDescription className="text-xs">Scheduled outflows by age</CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-foreground tracking-tight">
              {formatCurrency(totalAP, currency)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Simple Visual Breakdown */}
        <div className="space-y-3">
          {apAgingData.map((item) => (
            <div key={item.bucket} className="space-y-2 group">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
                    {item.bucket}
                  </span>
                  {item.bucket === '90+ Days' && (
                    <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-bold">
                      CRITICAL
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {formatCurrency(item.amount, currency)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">({item.percentage}%)</span>
                </div>
              </div>

              {/* Modern Slim Progress Bar */}
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} transition-all duration-500 ease-in-out`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 2026 Insights Footer */}
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">
                Avg. Pay Cycle
              </p>
              <p className="text-sm font-bold text-foreground">22 Days</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Priority to Pay</p>
            <Link href="/finance/ap/invoices">
              <p className="text-sm font-bold text-primary underline cursor-pointer">3 Vendors</p>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
