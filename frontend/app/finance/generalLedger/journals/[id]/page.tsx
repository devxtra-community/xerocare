'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Printer,
  ShieldCheck,
  AlertCircle,
  History,
  Calendar,
  FileText,
  CheckCircle2,
} from 'lucide-react';

import StatusBadge from '@/components/Finance/statusBadge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { chartOfAccounts, mockJournals } from '@/lib/finance/finance';
import { Card, CardContent } from '@/components/ui/card';

export default function JournalViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [journal, setJournal] = useState(() => mockJournals.find((j) => j.id === id));

  /* ---------------- TOTALS & VALIDATION ---------------- */
  const { totalDebit, totalCredit, isBalanced } = useMemo(() => {
    if (!journal) return { totalDebit: 0, totalCredit: 0, isBalanced: false };
    const dr = journal.lines.reduce((s, l) => s + l.debit, 0);
    const cr = journal.lines.reduce((s, l) => s + l.credit, 0);
    return { totalDebit: dr, totalCredit: cr, isBalanced: dr === cr && dr > 0 };
  }, [journal]);

  if (!journal) {
    return <div className="p-12 text-center text-muted-foreground">Journal Entry not found.</div>;
  }

  const canPost = journal.status === 'Draft' && isBalanced;

  /* ---------------- ACTIONS ---------------- */
  const postJournal = () => {
    const index = mockJournals.findIndex((j) => j.id === journal.id);
    if (index !== -1) {
      const updated = { ...journal, status: 'Posted' as const };
      mockJournals[index] = updated;
      setJournal(updated);
    }
  };

  const getAccountName = (accountId: string) => {
    const acc = chartOfAccounts.find((a) => a.id === accountId);
    return acc ? `${acc.code} — ${acc.name}` : 'Unknown Account';
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 bg-slate-50/30 min-h-screen">
      {/* 1. Sticky Audit Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{journal.reference}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="font-mono">ID: {journal.id}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {journal.date}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Printer className="w-4 h-4 mr-2" /> Print Audit
          </Button>
          {journal.status === 'Draft' ? (
            <Button
              onClick={postJournal}
              disabled={!canPost}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Commit to Ledger
            </Button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-100 text-sm font-bold">
              <ShieldCheck className="w-4 h-4" /> Locked Ledger Entry
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Main Ledger Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="p-6 border-b bg-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <h2 className="font-black text-slate-900 uppercase tracking-tighter">
                  Double-Entry Ledger
                </h2>
              </div>
              <StatusBadge status={journal.status} />
            </div>

            <div className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6 py-4 text-[11px] font-bold uppercase tracking-wider">
                      Account Distribution
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider w-[120px]">
                      Debit (DR)
                    </TableHead>
                    <TableHead className="text-right pr-6 text-[11px] font-bold uppercase tracking-wider w-[120px]">
                      Credit (CR)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journal.lines.map((line) => (
                    <TableRow key={line.id} className="hover:bg-slate-50/30">
                      <TableCell className="pl-6 py-4">
                        <div className="font-bold text-slate-900 underline decoration-slate-200 underline-offset-4 decoration-1">
                          {getAccountName(line.accountId)}
                        </div>
                        {line.description && (
                          <p className="text-xs text-muted-foreground mt-1">{line.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-slate-700">
                        {line.debit > 0
                          ? line.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right pr-6 font-mono text-sm text-slate-700">
                        {line.credit > 0
                          ? line.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals Row */}
                  <TableRow className="bg-slate-900 hover:bg-slate-900 text-white font-bold">
                    <TableCell className="pl-6 py-4">Total Posting Amount</TableCell>
                    <TableCell className="text-right font-mono text-base">
                      {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right pr-6 font-mono text-base">
                      {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Validation Feedback */}
          {!isBalanced && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-900">Journal Out of Balance</p>
                <p className="text-xs text-red-700">
                  The total debits must equal total credits before posting to the general ledger.
                  Current variance: {(totalDebit - totalCredit).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 3. Audit Sidebar */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm ring-1 ring-slate-200">
            <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600">
                Entry Metadata
              </h3>
            </div>
            <CardContent className="p-6 space-y-4">
              <SidebarItem label="Accounting Period" value={journal.date.slice(0, 7)} />
              <SidebarItem label="Source Document" value="Manual Journal" />
              <SidebarItem
                label="Ledger Impact"
                value={journal.status === 'Posted' ? 'Real-Time' : 'Draft'}
              />
              <div className="pt-4 border-t">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2">
                  Audit History
                </p>
                <div className="space-y-3">
                  <AuditLog date={journal.date} user="System Admin" action="Journal Created" />
                  {journal.status === 'Posted' && (
                    <AuditLog date="Current Time" user="System Admin" action="Posted to Ledger" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------------- UI HELPERS ---------------- */

function SidebarItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-slate-900">{value}</span>
    </div>
  );
}

function AuditLog({ date, user, action }: { date: string; user: string; action: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
      <div>
        <p className="text-xs font-bold text-slate-900 leading-none">{action}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {user} • {date}
        </p>
      </div>
    </div>
  );
}
