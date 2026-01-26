'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  FileSpreadsheet,
  Lock,
  Unlock,
  ChevronRight,
  Calculator,
} from 'lucide-react';

import AddJournalDialog from '@/components/Finance/AddJournalDialog';
import PageHeader from '@/components/Finance/pageHeader';
import StatusBadge from '@/components/Finance/statusBadge';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

import { accountingPeriods, mockJournals } from '@/lib/finance/finance';

/* ---------------- HELPERS ---------------- */

export const isPeriodClosed = (date: string) => {
  const month = date.slice(0, 7); // YYYY-MM
  return accountingPeriods.some((p) => p.month === month && p.status === 'Closed');
};

type DatePreset = 'all' | 'this_month' | 'last_month' | 'custom';

export default function JournalEntriesPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');

  /* ---------------- LOGIC ---------------- */

  const processedJournals = useMemo(() => {
    return mockJournals.map((j) => {
      const totalDebit = j.lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = j.lines.reduce((sum, l) => sum + l.credit, 0);
      const isBalanced = totalDebit === totalCredit;
      const closed = isPeriodClosed(j.date);

      return { ...j, totalDebit, totalCredit, isBalanced, closed };
    });
  }, []);

  const filteredJournals = processedJournals.filter((j) => {
    const matchesStatus = statusFilter === 'All' || j.status === statusFilter;
    const matchesSearch = j.reference.toLowerCase().includes(search.toLowerCase());
    // ||
    // j.description?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getDateRangeFromPreset = (preset: DatePreset) => {
    const today = new Date();
    let from = '';
    let to = '';

    if (preset === 'this_month') {
      from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      to = today.toISOString().slice(0, 10);
    }

    if (preset === 'last_month') {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      from = first.toISOString().slice(0, 10);
      to = last.toISOString().slice(0, 10);
    }

    return { from, to };
  };

  const totalDebitSum = filteredJournals.reduce((s, j) => s + j.totalDebit, 0);

  return (
    <div className="p-4 sm:p-8 space-y-6 bg-slate-50/50 min-h-screen">
      <PageHeader
        title="Journal Entries"
        description="General Ledger record management and audit logs."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="hidden sm:flex border-slate-200">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Export
            </Button>
            <Button
              onClick={() => setOpen(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" /> New Entry
            </Button>
          </div>
        }
      />

      {/* 1. Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Volume (Debit)"
          value={totalDebitSum}
          icon={<Calculator className="text-blue-600" />}
        />
        <StatsCard
          title="Draft Entries"
          value={processedJournals.filter((j) => j.status === 'Draft').length}
          isCount
          icon={<FileSpreadsheet className="text-amber-600" />}
        />
        <StatsCard
          title="Active Period"
          value="January 2026"
          isText
          icon={<Unlock className="text-green-600" />}
        />
      </div>

      {/* 2. Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search reference or description..."
            className="pl-10 bg-slate-50 border-none h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Select
            value={datePreset}
            onValueChange={(v: DatePreset) => {
              setDatePreset(v);

              if (v === 'custom' || v === 'all') {
                setFromDate('');
                setToDate('');
              } else {
                const range = getDateRangeFromPreset(v);
                setFromDate(range.from);
                setToDate(range.to);
              }
            }}
          >
            <SelectTrigger className="w-40 bg-white">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {datePreset === 'custom' && (
            <>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-white"
              />
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-white"
              />
            </>
          )}

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Posted">Posted</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch('');
              setStatusFilter('All');
              setDatePreset('all');
              setFromDate('');
              setToDate('');
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* 3. Table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="pl-6 w-[120px]">Date</TableHead>
              <TableHead>Reference & Audit</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="pl-10">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredJournals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">
                  No journals found for the selected criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredJournals.map((j) => (
                <TableRow key={j.id} className="group hover:bg-slate-50/50 transition-colors">
                  <TableCell className="pl-6 py-4">
                    <div className="text-sm font-semibold text-slate-900">{j.date}</div>
                    {j.closed ? (
                      <div className="flex items-center gap-1 text-[10px] text-destructive font-bold uppercase mt-1">
                        <Lock className="w-2.5 h-2.5" /> Closed
                      </div>
                    ) : (
                      <div className="text-[10px] text-green-600 font-bold uppercase mt-1 flex items-center gap-1">
                        <Unlock className="w-2.5 h-2.5" /> Open
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    <Link
                      href={`/finance/generalLedger/journals/${j.id}`}
                      className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {j.reference}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                      {j.lines.length} Lines • {j.isBalanced ? 'Balanced' : 'Unbalanced'}
                    </div>
                  </TableCell>

                  <TableCell className="text-right font-black text-slate-900">
                    {j.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>

                  <TableCell className="text-right font-black text-slate-900">
                    {j.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>

                  <TableCell className="pl-10">
                    <StatusBadge status={j.status} />
                  </TableCell>

                  <TableCell className="pr-4">
                    <Link
                      href={`/finance/generalLedger/journals/${j.id}`}
                      className="flex items-center justify-end"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddJournalDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

/* ---------------- UI COMPONENTS ---------------- */

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  isCount?: boolean;
  isText?: boolean;
}

function StatsCard({ title, value, icon, isCount, isText }: StatsCardProps) {
  return (
    <Card className="border-none shadow-sm ring-1 ring-slate-200">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            {title}
          </p>
          <h3 className="text-2xl font-black text-slate-900">
            {!isCount && !isText && 'AED '}
            {isText ? value : value.toLocaleString()}
          </h3>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">{icon}</div>
      </CardContent>
    </Card>
  );
}
