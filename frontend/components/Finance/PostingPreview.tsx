'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { FileCheck } from 'lucide-react';

import { buildPostingPreview, POSTING_CONFIG, PostingType } from '@/lib/finance/finance';
import { chartOfAccounts } from '@/lib/finance/finance';
import { products } from '@/lib/finance/ar';

export default function PostingPreview({
  type,
  invoice,
}: {
  type: PostingType;
  invoice: Record<string, unknown>;
}) {
  const config = POSTING_CONFIG[type];

  const lines = buildPostingPreview({
    type,
    invoice,
    chartOfAccounts,
    products,
  });

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-blue-700 font-semibold">
          <FileCheck className="w-5 h-5" />
          {config.title}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {lines.map((l, i) => (
              <TableRow key={i}>
                <TableCell>
                  {l.accountCode} — {l.accountName}
                </TableCell>
                <TableCell className="text-right">
                  {l.debit ? l.debit.toLocaleString() : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {l.credit ? l.credit.toLocaleString() : '-'}
                </TableCell>
              </TableRow>
            ))}

            <TableRow className="font-bold border-t">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{totalDebit.toLocaleString()}</TableCell>
              <TableCell className="text-right">{totalCredit.toLocaleString()}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {totalDebit === totalCredit && (
          <p className="text-sm text-green-600 font-semibold">✓ Journal is balanced</p>
        )}
      </CardContent>
    </Card>
  );
}
