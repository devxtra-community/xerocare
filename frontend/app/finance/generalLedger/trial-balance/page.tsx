'use client';

import PageHeader from '@/components/Finance/pageHeader';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { buildTrialBalance } from '@/lib/finance';

export default function TrialBalancePage() {
  const rows = buildTrialBalance();

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trial Balance"
        description="Summary of all posted general ledger balances"
      />

      <div className="bg-card border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.accountId}>
                <TableCell>
                  {row.code} — {row.name}
                </TableCell>
                <TableCell className="text-right">
                  {row.debit ? row.debit.toLocaleString() : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {row.credit ? row.credit.toLocaleString() : '-'}
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

      {totalDebit !== totalCredit && (
        <p className="text-sm text-red-500">
          Trial Balance is not balanced — check posted journals
        </p>
      )}
    </div>
  );
}
