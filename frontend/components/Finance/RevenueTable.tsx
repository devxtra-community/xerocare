'use client';

import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getInvoices, Invoice } from '@/lib/invoice';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function RevenueTable() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await getInvoices();
      // Only show finance-approved or finalized invoices if necessary,
      // but usually dashboard shows all relevant revenue entries.
      // Filtering for 'FINAL' or approved ones might be better if the user only wants realized revenue.
      // Based on the request, showing all invoices seems appropriate.
      setInvoices(data || []);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>
    );
  }

  // Flatten invoices to rows (one row per item)
  const rows = invoices.flatMap((invoice) => {
    if (!invoice.items || invoice.items.length === 0) {
      return [
        {
          id: `${invoice.id}-no-items`,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          employeeName: invoice.employeeName,
          saleType: invoice.saleType,
          createdAt: invoice.createdAt,
          product: 'N/A',
          qty: 0,
          amount: invoice.totalAmount,
        },
      ];
    }
    return invoice.items.map((item, index) => ({
      id: `${invoice.id}-${index}`,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      employeeName: invoice.employeeName,
      saleType: invoice.saleType,
      createdAt: invoice.createdAt,
      product: item.description,
      qty: item.quantity || 1,
      // For line items, we ideally want line item amount, but invoice often has unitPrice/quantity
      amount: item.unitPrice
        ? item.unitPrice * (item.quantity || 1)
        : invoice.totalAmount / invoice.items!.length,
    }));
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-primary">Revenue Transactions</h2>
          <p className="text-sm text-muted-foreground">Detailed breakdown of revenue by item</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchInvoices} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold">Invoice #</TableHead>
              <TableHead className="font-bold">Customer</TableHead>
              <TableHead className="font-bold">Employee</TableHead>
              <TableHead className="font-bold text-center">Type</TableHead>
              <TableHead className="font-bold">Date</TableHead>
              <TableHead className="font-bold">Product</TableHead>
              <TableHead className="font-bold text-center">Qty</TableHead>
              <TableHead className="font-bold text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No revenue transactions found
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-blue-600">{row.invoiceNumber}</TableCell>
                  <TableCell>{row.customerName}</TableCell>
                  <TableCell>{row.employeeName}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.saleType === 'RENT'
                          ? 'bg-blue-100 text-blue-700'
                          : row.saleType === 'SALE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {row.saleType}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(row.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate" title={row.product}>
                    {row.product}
                  </TableCell>
                  <TableCell className="text-center">{row.qty}</TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    ₹{row.amount?.toLocaleString('en-IN')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
