'use client';

import { useParams } from 'next/navigation';
import PageHeader from '@/components/Finance/pageHeader';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { chartOfAccounts, buildLedgerForAccount } from '@/lib/finance';

export default function LedgerAccountPage() {
  const { accountId } = useParams();

  const account = chartOfAccounts.find((a) => a.id === accountId);
  const rows = buildLedgerForAccount(accountId as string);

  if (!account) {
    return <p className="text-muted-foreground">Account not found</p>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${account.code} — ${account.name}`}
        description="Ledger account details (posted journals only)"
      />

      <div className="bg-card border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Journal</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  No posted entries for this account
                </TableCell>
              </TableRow>
            )}

            {rows.map((r, idx) => (
              <TableRow key={idx}>
                <TableCell>{r.date}</TableCell>
                <TableCell>{r.reference}</TableCell>
                <TableCell className="text-right">
                  {r.debit ? r.debit.toLocaleString() : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {r.credit ? r.credit.toLocaleString() : '-'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {r.balance.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
