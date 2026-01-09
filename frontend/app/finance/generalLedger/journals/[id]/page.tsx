'use client';

import PageHeader from '@/components/Finance/pageHeader';
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
import { chartOfAccounts, mockJournals } from '@/lib/finance';

import { useParams } from 'next/navigation';
import { useState } from 'react';

export default function JournalViewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [journal, setJournal] = useState(() => mockJournals.find((j) => j.id === id));

  if (!journal) {
    return <p className="text-muted-foreground">Journal not found</p>;
  }

  /* ---------------- TOTALS ---------------- */

  const totalDebit = journal.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = journal.lines.reduce((s, l) => s + l.credit, 0);

  const canPost = journal.status === 'Draft' && totalDebit === totalCredit && totalDebit > 0;

  /* ---------------- ACTIONS ---------------- */

  const postJournal = () => {
    const index = mockJournals.findIndex((j) => j.id === journal.id);
    if (index !== -1) {
      mockJournals[index] = { ...journal, status: 'Posted' };
      setJournal(mockJournals[index]);
    }
  };

  /* ---------------- HELPERS ---------------- */

  const getAccountName = (accountId: string) => {
    const acc = chartOfAccounts.find((a) => a.id === accountId);
    return acc ? `${acc.code} — ${acc.name}` : 'Unknown Account';
  };

  /* ---------------- RENDER ---------------- */

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Journal ${journal.reference}`}
        description={`Date: ${journal.date}`}
        action={
          journal.status === 'Draft' ? (
            <Button onClick={postJournal} disabled={!canPost}>
              Post Journal
            </Button>
          ) : (
            <StatusBadge status="Posted" />
          )
        }
      />

      {journal.status === 'Posted' && (
        <p className="text-sm text-muted-foreground">
          This journal has been posted and can no longer be edited.
        </p>
      )}

      <div className="bg-card border rounded-xl p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {journal.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>{getAccountName(line.accountId)}</TableCell>
                <TableCell className="text-right">
                  {line.debit ? line.debit.toLocaleString() : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {line.credit ? line.credit.toLocaleString() : '-'}
                </TableCell>
              </TableRow>
            ))}

            <TableRow className="font-semibold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{totalDebit.toLocaleString()}</TableCell>
              <TableCell className="text-right">{totalCredit.toLocaleString()}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
