'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, Wallet } from 'lucide-react';
import Link from 'next/link';

const apAgingData = [
  { bucket: 'Current', amount: 38000, color: 'bg-indigo-600', percentage: 63 },
  { bucket: '1–30 Days', amount: 12000, color: 'bg-indigo-400', percentage: 20 },
  { bucket: '31–60 Days', amount: 6400, color: 'bg-slate-400', percentage: 10 },
  { bucket: '61–90 Days', amount: 2900, color: 'bg-slate-300', percentage: 5 },
  { bucket: '90+ Days', amount: 1100, color: 'bg-rose-400', percentage: 2 },
];

export default function APDueAgingChart() {
  const totalAP = apAgingData.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className=" p-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-card rounded-lg  border-border shadow-sm">
              <Wallet className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-700">
                Accounts Payable
              </CardTitle>
              <CardDescription className="text-xs">Scheduled outflows by age</CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-foreground tracking-tight">
              AED {totalAP.toLocaleString()}
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
                    <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-bold">
                      CRITICAL
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    AED {item.amount.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 ml-2">({item.percentage}%)</span>
                </div>
              </div>

              {/* Modern Slim Progress Bar */}
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} transition-all duration-500 ease-in-out`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 2026 Insights Footer */}
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">
                Avg. Pay Cycle
              </p>
              <p className="text-sm font-bold text-slate-800">22 Days</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Priority to Pay</p>
            <Link href="/finance/ap/invoices">
              <p className="text-sm font-bold text-indigo-600 underline cursor-pointer">
                3 Vendors
              </p>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
