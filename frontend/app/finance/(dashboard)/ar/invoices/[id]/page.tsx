'use client';

import { useState, useMemo, useEffect } from 'react';
import { notFound, useParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer, Download, CreditCard, Calendar, User, FileCheck } from 'lucide-react';
import { arInvoices, arCustomers, products } from '@/lib/finance/ar';
import StatusBadge from '@/components/Finance/statusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function InvoiceViewPage() {
  const { id } = useParams<{ id: string }>();

  const router = useRouter();

  const invoice = arInvoices.find((i) => i.id === id);
  if (!invoice) notFound();

  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setNow(new Date()), 0);
    return () => clearTimeout(timer);
  }, []);

  // Derived overdue status
  const isOverdue = useMemo(() => {
    if (!now || invoice.status !== 'Posted') return false;
    return new Date(invoice.dueDate) < now && invoice.balanceDue > 0;
  }, [now, invoice.status, invoice.dueDate, invoice.balanceDue]);

  const customer = arCustomers.find((c) => c.id === invoice.customerId);

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 bg-muted/50/30 min-h-screen">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card/80 backdrop-blur sticky top-0 z-10 p-4 border rounded-xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {invoice.invoiceNumber}
          </h1>
          <p className="text-xs text-muted-foreground">Issued: {invoice.issueDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex border-border">
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" size="sm" className="border-border">
            <Download className="w-4 h-4 mr-2" /> PDF
          </Button>

          {invoice.status === 'Draft' && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => router.push(`/finance/ar/invoices/${invoice.id}/post`)}
            >
              <FileCheck className="w-4 h-4 mr-2" /> Post to GL
            </Button>
          )}

          {invoice.balanceDue > 0 && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <CreditCard className="w-4 h-4 mr-2" /> Record Payment
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Document Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border shadow-sm rounded-2xl overflow-hidden">
            {/* Header Branding */}
            <div className="p-8 border-b bg-muted/50/50 flex justify-between items-start">
              <div className="space-y-1">
                <div className="text-2xl font-black tracking-tighter text-blue-600">
                  Sales Invoice
                </div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                  Accounts Receivable
                </p>
              </div>
              <div className="text-right">
                <StatusBadge status={invoice.status} isOverdue={isOverdue} />
                {isOverdue && (
                  <p className="text-[10px] text-destructive font-bold mt-2 animate-pulse">
                    ACTION REQUIRED
                  </p>
                )}
              </div>
            </div>

            {/* Customer & Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3" /> Bill To
                  </label>
                  <div className="mt-2 space-y-1">
                    <p className="font-bold text-lg text-foreground">{customer?.name}</p>
                    <p className="text-sm text-muted-foreground">ID: {customer?.id}</p>
                    <p className="text-sm text-muted-foreground italic uppercase text-[10px]">
                      Verified Customer
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-xl border border-slate-100">
                <DetailItem label="Currency" value={invoice.currency} />
                <DetailItem label="Terms" value="Net 30" />
                <DetailItem label="Due Date" value={invoice.dueDate} />
                <DetailItem label="Ref #" value={invoice.id.split('-')[1]} />
              </div>
            </div>

            {/* Itemized Table */}
            <div className="px-1 border-t border-slate-100">
              <Table>
                <TableHeader className="bg-muted/50/50">
                  <TableRow>
                    <TableHead className="pl-8 text-[11px] uppercase font-bold">
                      Item & Mode
                    </TableHead>
                    <TableHead className="text-[11px] uppercase font-bold text-right">
                      Qty/Period
                    </TableHead>
                    <TableHead className="text-right pr-8 text-[11px] uppercase font-bold">
                      Amount ({invoice.currency})
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lines.map((line) => {
                    const product = products.find((p) => p.id === line.productId);
                    return (
                      <TableRow key={line.id} className="hover:bg-muted/50/30 border-slate-100">
                        <TableCell className="pl-8 py-4">
                          <div className="font-bold text-foreground">
                            {product?.name || line.description}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-medium mt-0.5 tracking-wide uppercase">
                            {product?.code} • {product?.mode}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm text-slate-600">
                          {product?.mode === 'Sell' ? (
                            `${line.qty} Units @ ${line.rate}`
                          ) : (
                            <div className="leading-tight">
                              <div>
                                {line.startDate} → {line.endDate}
                              </div>
                              <div className="text-[10px] italic">Rate: {line.rate}</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-8 font-black text-foreground text-base">
                          {line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Financial Footer */}
            <div className="p-8 border-t border-slate-100 bg-muted/50/30 flex justify-end">
              <div className="w-full max-w-[240px] space-y-3">
                <SummaryRow
                  label="Subtotal"
                  value={invoice.totalAmount}
                  currency={invoice.currency}
                />
                <SummaryRow label="Tax (0%)" value={0} currency={invoice.currency} />
                <div className="flex justify-between items-center pt-3 border-t-2 border-border">
                  <span className="text-sm font-black uppercase tracking-tighter">Total </span>
                  <span className="text-xl font-black text-blue-600">
                    {invoice.currency} {invoice.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm ring-1 ring-slate-200">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest border-b pb-2">
                Timeline
              </h3>
              <DetailItem
                icon={<Calendar className="w-3.5 h-3.5" />}
                label="Created"
                value={invoice.issueDate}
                horizontal
              />
              <DetailItem
                icon={<Calendar className="w-3.5 h-3.5 text-blue-500" />}
                label="Due Date"
                value={invoice.dueDate}
                horizontal
              />
            </CardContent>
          </Card>
          {/* <Card className="border-none shadow-sm ring-1 ring-slate-200">
                        <CardContent className="p-6 space-y-4 text-center">
                            <p className="text-xs text-muted-foreground italic">Please quote {invoice.invoiceNumber} in all payment communications.</p>
                        </CardContent>
                    </Card> */}
        </div>
      </div>
    </div>
  );
}

/* ---------------- UI HELPERS ---------------- */

function DetailItem({
  label,
  value,
  icon,
  horizontal,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  horizontal?: boolean;
}) {
  if (horizontal)
    return (
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
          {icon}
          {label}
        </span>
        <span className="text-sm font-bold text-foreground">{value}</span>
      </div>
    );
  return (
    <div className="space-y-0.5">
      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
        {icon}
        {label}
      </label>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  currency,
}: {
  label: string;
  value: number;
  currency: string;
}) {
  return (
    <div className="flex justify-between text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
      <span>{label}</span>
      <span>
        {currency} {value.toLocaleString()}
      </span>
    </div>
  );
}
