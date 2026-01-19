'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpDown,
  FileText,
  Printer,
  Download,
  Calendar,
  Calculator,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { chartOfAccounts, mockJournals } from '@/lib/finance/finance';

export default function LedgerAccountPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const account = chartOfAccounts.find((a) => a.id === accountId);

  /* ---------------- DATA LOGIC ---------------- */
  const { rows, openingBalance, closingBalance } = useMemo(() => {
    if (!account || account.isGroup) return { rows: [], openingBalance: 0, closingBalance: 0 };

    const postedJournals = mockJournals.filter((j) => j.status === 'Posted');

    const rawEntries = postedJournals
      .flatMap((journal) =>
        journal.lines
          .filter((line) => line.accountId === accountId)
          .map((line) => ({
            id: `${journal.id}-${line.id}`,
            journalId: journal.id,
            date: journal.date,
            reference: journal.reference,
            debit: line.debit,
            credit: line.credit,
          })),
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    const entries = rawEntries.reduce(
      (acc, entry) => {
        const movement =
          account.type === 'Asset' || account.type === 'Expense'
            ? entry.debit - entry.credit
            : entry.credit - entry.debit;

        const previousBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
        const newBalance = previousBalance + movement;

        acc.push({ ...entry, balance: newBalance });
        return acc;
      },
      [] as Array<(typeof rawEntries)[0] & { balance: number }>,
    );

    const closingBalance = entries.length > 0 ? entries[entries.length - 1].balance : 0;

    const openBal =
      entries.length > 0
        ? entries[0].balance -
          (account.type === 'Asset' || account.type === 'Expense'
            ? entries[0].debit - entries[0].credit
            : entries[0].credit - entries[0].debit)
        : 0;

    return {
      rows: entries,
      openingBalance: openBal,
      closingBalance: closingBalance,
    };
  }, [account, accountId]);

  /* ---------------- GUARDS ---------------- */
  if (!account)
    return <div className="p-12 text-center text-muted-foreground">Account not found</div>;
  if (account.isGroup)
    return (
      <div className="p-12 text-center space-y-4">
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl inline-block">
          <p className="text-amber-800 font-medium">
            Group accounts do not maintain individual ledgers.
          </p>
        </div>
      </div>
    );

  return (
    <div className="p-4 sm:p-8 space-y-6 bg-slate-50/50 min-h-screen">
      {/* 1. Audit Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/finance/generalLedger/chart-of-accounts">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {account.code} — {account.name}
            </h1>
            <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest flex items-center gap-2">
              <span className="text-blue-600">{account.type} Account</span> • Ledger View
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" className="bg-white flex-1 md:flex-none">
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" size="sm" className="bg-white flex-1 md:flex-none">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* 2. Ledger KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Opening Balance"
          value={openingBalance}
          icon={<Calculator className="text-slate-400" />}
        />
        <StatsCard
          title="Net Movement"
          value={closingBalance - openingBalance}
          icon={<ArrowUpDown className="text-blue-500" />}
        />
        <StatsCard
          title="Closing Balance"
          value={closingBalance}
          highlight
          icon={<FileText className="text-blue-600" />}
        />
      </div>

      {/* 3. Transaction Table */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-8 py-4 w-[140px]">Date</TableHead>
              <TableHead>Reference / Journal</TableHead>
              <TableHead className="text-right w-[140px]">Debit (DR)</TableHead>
              <TableHead className="text-right w-[140px]">Credit (CR)</TableHead>
              <TableHead className="text-right pr-8 w-[160px]">Running Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Opening Balance Row */}
            <TableRow className="bg-slate-50/30 italic">
              <TableCell className="pl-8 font-bold text-slate-400" colSpan={4}>
                Initial Balance Carryforward
              </TableCell>
              <TableCell className="text-right pr-8 font-mono font-bold text-slate-500">
                {openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </TableCell>
            </TableRow>

            {rows.map((row) => (
              <TableRow key={row.id} className="group hover:bg-slate-50/50 transition-colors">
                <TableCell className="pl-8">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {row.date}
                  </div>
                </TableCell>

                <TableCell>
                  <Link
                    href={`/finance/generalLedger/journals/${row.journalId}`}
                    className="group/link flex items-center gap-1 font-bold text-slate-900 hover:text-blue-600 transition-colors"
                  >
                    {row.reference}
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-all" />
                  </Link>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                    Journal ID: {row.journalId}
                  </span>
                </TableCell>

                <TableCell className="text-right font-mono text-slate-700">
                  {row.debit > 0
                    ? row.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })
                    : '—'}
                </TableCell>

                <TableCell className="text-right font-mono text-slate-700">
                  {row.credit > 0
                    ? row.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })
                    : '—'}
                </TableCell>

                <TableCell className="text-right pr-8 font-mono font-black text-slate-900">
                  {row.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            ))}

            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-20 text-center text-muted-foreground italic">
                  No posted transactions recorded for this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ---------------- UI HELPERS ---------------- */

function StatsCard({
  title,
  value,
  icon,
  highlight,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`border-none shadow-sm ring-1 ${highlight ? 'ring-blue-200 bg-blue-50/20' : 'ring-slate-200 bg-white'}`}
    >
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            {title}
          </p>
          <h3 className={`text-2xl font-black ${highlight ? 'text-blue-700' : 'text-slate-900'}`}>
            <span className="text-sm font-medium mr-1 opacity-50">AED</span>
            {value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">{icon}</div>
      </CardContent>
    </Card>
  );
}
