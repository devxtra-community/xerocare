'use client';

import Link from 'next/link';
import { mockJournals } from '@/lib/finance/finance';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/Finance/statusBadge';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function RecentJournalTable() {
  // Sorting by date (Newest first)
  const journals = [...mockJournals]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="shadow-sm border-slate-200 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 bg-slate-50/30">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <CardTitle className="text-lg font-semibold">General Ledger Activity</CardTitle>
        </div>
        <Link href="/finance/generalLedger/journals">
          <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50">
            View Ledger <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
              <TableHead className="py-3">Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Total Debit</TableHead>
              <TableHead className="text-right">Total Credit</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {journals.map((j) => {
              const totalDebit = j.lines.reduce((s, l) => s + l.debit, 0);
              const totalCredit = j.lines.reduce((s, l) => s + l.credit, 0);
              const isBalanced = totalDebit === totalCredit;

              return (
                <TableRow key={j.id} className="group hover:bg-slate-50/80 transition-colors">
                  <TableCell className="text-slate-500 font-medium">{formatDate(j.date)}</TableCell>

                  <TableCell>
                    <Link
                      href={`/finance/generalLedger/journals/${j.id}`}
                      className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors"
                    >
                      {j.reference}
                    </Link>
                    {/* <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">
                      ID: {j.id.split('-')[0]}
                    </p> */}
                  </TableCell>

                  <TableCell className="text-right font-semibold tabular-nums text-slate-700">
                    {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>

                  <TableCell className="text-right font-semibold tabular-nums text-slate-700">
                    {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <StatusBadge status={j.status} />
                      {isBalanced && j.status === 'Posted' && (
                        <div className="flex items-center gap-1 text-[9px] text-emerald-600 font-bold uppercase">
                          <CheckCircle2 className="w-2 h-2" /> Balanced
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Quick Footer for audit context */}
        {/* <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
           <p className="text-[11px] text-slate-400 uppercase font-bold tracking-widest">
             End of recent activity
           </p>
        </div> */}
      </CardContent>
    </Card>
  );
}
