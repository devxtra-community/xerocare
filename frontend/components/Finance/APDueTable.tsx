'use client';

import Link from 'next/link';
// Assuming these imports work for your mock data and UI components
import { apInvoices, vendors, APInvoice, Vendor } from '@/lib/finance/ap';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

// Helper function for date formatting
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function APDueTable() {
  const dueInvoices = apInvoices
    .filter((inv: APInvoice) => inv.status !== 'Paid')
    .sort(
      (a: APInvoice, b: APInvoice) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    ) // Correct sorting
    .slice(0, 5); // Show top 5 priority invoices

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Upcoming Payables</CardTitle>
        <Link href="/finance/ap/invoices">
          <Button variant="ghost" size="sm" className="text-sm text-blue-600 hover:text-blue-700">
            View All <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[180px]">Vendor</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead className="w-[120px]">Due Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              {/* <TableHead className="w-[80px] text-right">Action</TableHead> */}
            </TableRow>
          </TableHeader>

          <TableBody>
            {dueInvoices.map((inv: APInvoice) => {
              const vendor = vendors.find((v: Vendor) => v.id === inv.vendorId);
              const overdue = isOverdue(inv.dueDate);

              return (
                <TableRow key={inv.id} className="hover:bg-blue-50/50 transition-colors">
                  <TableCell className="font-semibold text-slate-800">{vendor?.name}</TableCell>

                  <TableCell className="text-slate-500 hover:text-blue-600 cursor-pointer">
                    <Link
                      href={`/finance/ap/invoices/${inv.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {inv.invoiceNumber}
                    </Link>
                  </TableCell>

                  <TableCell className={overdue ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                    {formatDate(inv.dueDate)}
                  </TableCell>

                  <TableCell className="text-right font-black tabular-nums">
                    {inv.currency} {inv.totalAmount.toLocaleString()}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={overdue ? 'destructive' : 'secondary'}
                      className={`text-xs font-semibold ${overdue ? 'bg-rose-100 text-rose-800' : 'bg-green-100 text-green-800'}`}
                    >
                      {overdue ? 'Overdue' : 'Pending'}
                    </Badge>
                  </TableCell>
                  {/* 
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-100" title="Initiate Payment">
                      <DollarSign className="h-4 w-4" />
                    </Button>
                  </TableCell> */}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
