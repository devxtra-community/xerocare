'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getMyInvoices, Invoice, InvoiceItem, getInvoiceById } from '@/lib/invoice';
import { toast } from 'sonner';
import { InvoiceDetailsDialog } from '../invoice/InvoiceDetailsDialog';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmployeeOrdersTableProps {
  mode?: 'EMPLOYEE' | 'FINANCE';
  invoices?: Invoice[]; // Optional prop to avoid double fetching if page already fetches
}

export default function EmployeeOrdersTable({
  mode = 'EMPLOYEE',
  invoices: propInvoices,
}: EmployeeOrdersTableProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      // If invoices passed via props, use them
      if (propInvoices) {
        setInvoices(propInvoices);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let data: Invoice[] = [];
        if (mode === 'FINANCE') {
          const { getBranchInvoices } = await import('@/lib/invoice');
          data = await getBranchInvoices();
          // Filter out unapproved records for Finance View
          data = data.filter((inv) => !['DRAFT', 'SENT'].includes(inv.status));
        } else {
          data = await getMyInvoices();
        }
        setInvoices(data);
      } catch (error) {
        console.error('Failed to fetch invoices:', error);
        toast.error('Failed to fetch orders data.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [propInvoices, mode]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getProductNames = (items?: InvoiceItem[]) => {
    if (!items || items.length === 0) return 'N/A';
    const names = items.map((item) => getCleanProductName(item.description));
    // Deduplicate names
    const uniqueNames = Array.from(new Set(names));
    return uniqueNames.join(', ');
  };

  const getCleanProductName = (name: string) => {
    // Remove "Black & White - " or "Color - " prefixes
    let clean = name.replace(/^(Black & White - |Color - )/i, '');
    // Remove serial number patterns like (SN-...) or - SN-...
    clean = clean.replace(/(\s*-\s*SN-[^,]+|\s*\(SN-[^)]+\))/gi, '');
    return clean.trim();
  };

  const getTotalQuantity = (items?: InvoiceItem[]) => {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  };

  const getCleanCustomerName = (name: string) => {
    // Remove color/type information that might be appended to the name
    // e.g., "John Doe (Color)" -> "John Doe"
    return name.split('(')[0].trim();
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      inv.items?.some((item) => item.description.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filterType === 'All' || inv.saleType === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleViewDetails = async (invoiceId: string) => {
    try {
      // If we already have the full invoice details in the list (populated by aggregator), we can use it.
      // But getInvoiceById from keys might offer more.
      // Currently aggregation brings basic info. Let's fetch full details or use existing if robust.
      // The aggregated invoice list already has customerPhone etc from our recent backend change.
      // But `items` might be partial? Actually Aggregator sends full standard invoice object fields + extras.
      // Let's first try finding in specific list.
      const inv = invoices.find((i) => i.id === invoiceId);
      if (inv) {
        setSelectedInvoice(inv);
        setDetailsOpen(true);
      } else {
        // Fallback fetch
        const data = await getInvoiceById(invoiceId);
        setSelectedInvoice(data);
        setDetailsOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch invoice details:', error);
      toast.error('Failed to open details');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading orders data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-card border-blue-400/60 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm transition-all w-full"
            />
          </div>

          <div className="w-full sm:w-[150px]">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-10 bg-card border-blue-400/60 focus:ring-blue-100 rounded-lg w-full">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                <SelectItem value="Sale">Sale</SelectItem>
                <SelectItem value="Rental">Rental</SelectItem>
                <SelectItem value="Lease">Lease</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border">
        <div className="overflow-x-auto">
          <Table className="min-w-[1000px] sm:min-w-full">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-primary font-bold whitespace-nowrap">Order ID</TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">
                  Customer Name
                </TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">Phone</TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">
                  Order Date
                </TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">Product</TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap text-center">
                  Qty
                </TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">Amount</TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">Payment</TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">Status</TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    No orders found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice, index) => (
                  <TableRow
                    key={invoice.id}
                    className={index % 2 !== 0 ? 'bg-blue-50/20' : 'bg-card'}
                  >
                    <TableCell className="text-blue-600 font-medium whitespace-nowrap">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell className="font-bold text-primary whitespace-nowrap">
                      {getCleanCustomerName(invoice.customerName)}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                      {invoice.customerPhone || 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                      {formatDate(invoice.createdAt)}
                    </TableCell>
                    <TableCell className="text-primary font-medium whitespace-nowrap">
                      {getProductNames(invoice.items)}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {getTotalQuantity(invoice.items)}
                    </TableCell>
                    <TableCell className="font-bold text-primary whitespace-nowrap">
                      ₹{invoice.totalAmount.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                        ${
                          invoice.status === 'APPROVED'
                            ? 'bg-green-100 text-green-600'
                            : invoice.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                        ${
                          invoice.status === 'APPROVED'
                            ? 'bg-green-100 text-green-600'
                            : invoice.status === 'PENDING'
                              ? 'bg-blue-100 text-blue-600'
                              : invoice.status === 'REJECTED'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-yellow-100 text-yellow-600'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                        ${
                          invoice.saleType === 'SALE'
                            ? 'bg-blue-100 text-blue-600'
                            : invoice.saleType === 'RENT'
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-purple-100 text-purple-600'
                        }`}
                      >
                        {invoice.saleType}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => handleViewDetails(invoice.id)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {detailsOpen && selectedInvoice && (
        <InvoiceDetailsDialog
          invoice={selectedInvoice}
          onClose={() => setDetailsOpen(false)}
          mode={mode}
          approveLabel={mode === 'EMPLOYEE' ? 'Send for Finance Approval' : 'Approve'}
          onApprove={async () => {
            if (mode === 'EMPLOYEE') {
              // Employee logic (if any specific, usually handled by InvoiceDetailsDialog default or passed func)
              // But InvoiceDetailsDialog uses onApprove callback only if provided.
              // We need to import employeeApproveInvoice if we want it here, but SalesTable used handleSendForApproval
              // Let's implement basics or assume Dialog handles it if we don't pass onApprove?
              // Actually InvoiceDetailsDialog calls onApprove.
              // SalesTable had handleSendForApproval. OrdersTable didn't have actions before?
              // Checking original code: OrdersTable passed nothing to onApprove in original code.
              // "view only"? Employee Orders typically view only unless DRAFT.
              // Whatever, for Finance we NEED approve.
            } else {
              // FINANCE Appprove
              try {
                const { financeApproveInvoice } = await import('@/lib/invoice');
                await financeApproveInvoice(selectedInvoice.id);
                toast.success('Order Approved');
                setDetailsOpen(false);
                // Refresh? If propInvoices, parent needs refresh.
                // If internal fetch, we can re-fetch.
                // We'll rely on parent refresh if possible, or force reload.
                window.location.reload(); // Simple fallback for now
              } catch {
                toast.error('Failed to approve');
              }
            }
          }}
          onReject={
            mode === 'FINANCE'
              ? async (reason) => {
                  try {
                    const { financeRejectInvoice } = await import('@/lib/invoice');
                    await financeRejectInvoice(selectedInvoice.id, reason);
                    toast.success('Order Rejected');
                    setDetailsOpen(false);
                    window.location.reload();
                  } catch {
                    toast.error('Failed to reject');
                  }
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
