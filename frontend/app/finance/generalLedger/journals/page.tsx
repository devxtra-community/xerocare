'use client';

import AddJournalDialog from '@/components/Finance/AddJournalDialog';
import PageHeader from '@/components/Finance/pageHeader';
import StatusBadge from '@/components/Finance/statusBadge';
import { Button } from '@/components/ui/button';
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
import { accountingPeriods, JournalEntry, mockJournals } from '@/lib/finance';
import Link from 'next/link';
import { useState } from 'react';

type JournalStatusFilter = 'All' | 'Draft' | 'Posted';

export const isPeriodClosed = (date: string) => {
  const month = date.slice(0, 7); // YYYY-MM
  return accountingPeriods.some((p) => p.month === month && p.status === 'Closed');
};

export default function JournalEntriesPage() {
  const [open, setOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<JournalStatusFilter>('All');

  const getTotalDebit = (lines: JournalEntry['lines']) =>
    lines.reduce((sum, l) => sum + l.debit, 0);

  const getTotalCredit = (lines: JournalEntry['lines']) =>
    lines.reduce((sum, l) => sum + l.credit, 0);

  const filteredJournals = mockJournals.filter((j) => {
    if (statusFilter === 'All') return true;
    return j.status === statusFilter;
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Journal Entries"
        description="Record and manage general ledger journal entries"
        action={<Button onClick={() => setOpen(true)}>Add Journal Entry</Button>}
      />

      <Select value={statusFilter} onValueChange={(v: JournalStatusFilter) => setStatusFilter(v)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All</SelectItem>
          <SelectItem value="Draft">Draft</SelectItem>
          <SelectItem value="Posted">Posted</SelectItem>
        </SelectContent>
      </Select>

      <div className="bg-card border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredJournals.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  No journal entries found
                </TableCell>
              </TableRow>
            )}

            {filteredJournals.map((j) => {
              const totalDebit = getTotalDebit(j.lines);
              const totalCredit = getTotalCredit(j.lines);

              return (
                <TableRow key={j.id}>
                  <TableCell>{j.date}</TableCell>

                  <TableCell className="font-medium">
                    <Link
                      href={`/finance/generalLedger/journals/${j.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {j.reference}
                    </Link>
                  </TableCell>

                  <TableCell className="text-right">{totalDebit.toLocaleString()}</TableCell>

                  <TableCell className="text-right">{totalCredit.toLocaleString()}</TableCell>

                  <TableCell>
                    <StatusBadge status={j.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AddJournalDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
