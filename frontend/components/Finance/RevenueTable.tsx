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
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';

export default function RevenueTable() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saleTypeFilter, setSaleTypeFilter] = useState('ALL');
  const { page: currentPage, limit, total, setPage, setTotal, totalPages } = usePagination(5);

  useEffect(() => {
    setPage(1);
  }, [search, saleTypeFilter, setPage]);

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

  // Move filteredRows and useEffect up before early return
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
          amount: Number(invoice.displayAmount) || Number(invoice.totalAmount),
          status: invoice.status,
        },
      ];
    }
    return invoice.items.map((item, index) => ({
      id: `${invoice.id}-${index}`,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      employeeName: invoice.employeeName,
      saleType: invoice.saleType,
      status: invoice.status,
      createdAt: invoice.createdAt,
      product: item.description,
      qty: item.quantity || 1,
      // For line items, we ideally want line item amount, but invoice often has unitPrice/quantity
      amount:
        Number(item.unitPrice) > 0
          ? Number(item.unitPrice) * (item.quantity || 1)
          : (Number(invoice.displayAmount) || Number(invoice.totalAmount)) /
            (invoice.items?.length || 1),
    }));
  });

  // Filter rows
  let filteredRows = rows;
  if (search) {
    const s = search.toLowerCase();
    filteredRows = filteredRows.filter(
      (r) =>
        r.customerName?.toLowerCase().includes(s) ||
        r.invoiceNumber?.toLowerCase().includes(s) ||
        r.product?.toLowerCase().includes(s),
    );
  }
  if (saleTypeFilter !== 'ALL') {
    filteredRows = filteredRows.filter((r) => r.saleType === saleTypeFilter);
  }

  useEffect(() => {
    setTotal(filteredRows.length);
  }, [filteredRows.length, setTotal]);

  const paginatedRows = filteredRows.slice((currentPage - 1) * limit, currentPage * limit);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-primary">Revenue Transactions</h2>
          <p className="text-sm text-muted-foreground">Detailed breakdown of revenue by item</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customer, invoice, product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={saleTypeFilter} onValueChange={setSaleTypeFilter}>
            <SelectTrigger className="w-full sm:w-[130px] h-9">
              <SelectValue placeholder="Sale Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="RENT">Rent</SelectItem>
              <SelectItem value="LEASE">Lease</SelectItem>
              <SelectItem value="SALE">Sale</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvoices}
            disabled={loading}
            className="w-full sm:w-auto h-9"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
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
              <TableHead className="font-bold text-center">Status</TableHead>
              <TableHead className="font-bold text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No revenue transactions found
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row) => (
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
                  <TableCell className="text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.status === 'APPROVED' ||
                        row.status === 'FINANCE_APPROVED' ||
                        row.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-700'
                          : row.status === 'REJECTED' || row.status === 'FINANCE_REJECTED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {row.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {formatCurrency(row.amount || 0)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
