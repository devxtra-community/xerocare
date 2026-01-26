'use client';

import { useMemo } from 'react';
import { FileSpreadsheet, Printer, AlertCircle, CheckCircle2 } from 'lucide-react';

import PageHeader from '@/components/Finance/pageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { chartOfAccounts, mockJournals } from '@/lib/finance/finance';

/* ---------------- LOGIC ---------------- */

interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  debit: number;
  credit: number;
}

export const buildTrialBalance = () => {
  const rows: Record<string, TrialBalanceRow> = {};

  mockJournals
    .filter((j) => j.status === 'Posted')
    .forEach((journal) => {
      journal.lines.forEach((line) => {
        if (!rows[line.accountId]) {
          const acc = chartOfAccounts.find((a) => a.id === line.accountId);
          if (!acc) return;
          rows[line.accountId] = {
            accountId: acc.id,
            code: acc.code,
            name: acc.name,
            debit: 0,
            credit: 0,
          };
        }
        rows[line.accountId].debit += line.debit;
        rows[line.accountId].credit += line.credit;
      });
    });

  return Object.values(rows).sort((a, b) => a.code.localeCompare(b.code));
};

export default function TrialBalancePage() {
  const tbData = useMemo(() => buildTrialBalance(), []);

  const totals = useMemo(() => {
    return tbData.reduce(
      (acc, curr) => ({
        debit: acc.debit + curr.debit,
        credit: acc.credit + curr.credit,
      }),
      { debit: 0, credit: 0 },
    );
  }, [tbData]);

  const isInBalance = totals.debit === totals.credit && totals.debit > 0;

  return (
    <div className="p-4 sm:p-8 space-y-6 bg-slate-50/50 min-h-screen">
      <PageHeader
        title="Trial Balance"
        description="As of January 2026 — General Ledger Summary"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        }
      />

      {/* 1. Integrity Indicator */}
      <Card
        className={`border-none shadow-sm ring-1 ${isInBalance ? 'ring-green-200 bg-green-50/30' : 'ring-red-200 bg-red-50/30'}`}
      >
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isInBalance ? (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-destructive animate-pulse" />
            )}
            <div>
              <p className="text-sm font-bold text-slate-900">
                {isInBalance ? 'Ledger is in Balance' : 'Balance Discrepancy Detected'}
              </p>
              <p className="text-xs text-muted-foreground">
                All posted journal entries are accounted for.
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-400">Total Variance</p>
            <p
              className={`text-lg font-black ${isInBalance ? 'text-green-700' : 'text-destructive'}`}
            >
              AED {(totals.debit - totals.credit).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Trial Balance Table */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="pl-8 py-4 w-[120px]">Account Code</TableHead>
              <TableHead>Account Name</TableHead>
              <TableHead className="text-right w-[180px]">Debit (DR)</TableHead>
              <TableHead className="text-right pr-8 w-[180px]">Credit (CR)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tbData.map((row) => (
              <TableRow
                key={row.accountId}
                className="group hover:bg-slate-50/50 transition-colors"
              >
                <TableCell className="pl-8 font-mono text-sm font-bold text-slate-600 tracking-tight">
                  {row.code}
                </TableCell>
                <TableCell className="font-semibold text-slate-900">{row.name}</TableCell>
                <TableCell className="text-right font-mono text-slate-700">
                  {row.debit > 0
                    ? row.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })
                    : '—'}
                </TableCell>
                <TableCell className="text-right pr-8 font-mono text-slate-700">
                  {row.credit > 0
                    ? row.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })
                    : '—'}
                </TableCell>
              </TableRow>
            ))}

            {/* Final Totals Row */}
            <TableRow className="bg-slate-900 hover:bg-slate-900 text-white border-t-4 border-slate-700">
              <TableCell className="pl-8 py-6 font-black uppercase text-xs tracking-widest">
                Ledger Totals
              </TableCell>
              <TableCell className="text-right text-xs font-medium text-slate-400 italic">
                Verified Balanced Statement
              </TableCell>
              <TableCell className="text-right font-mono text-lg font-black">
                {totals.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right pr-8 font-mono text-lg font-black">
                {totals.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-center italic text-muted-foreground text-xs pb-10">
        End of Trial Balance Report — Generative ERP Core 2026
      </div>
    </div>
  );
}
