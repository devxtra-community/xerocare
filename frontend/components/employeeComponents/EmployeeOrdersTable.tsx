'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Eye, Coins } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import Pagination from '@/components/Pagination';

interface EmployeeOrdersTableProps {
  mode?: 'EMPLOYEE' | 'FINANCE';
  invoices?: Invoice[]; // Optional prop to avoid double fetching if page already fetches
}

/**
 * Table displaying all orders (invoices) managed by the employee.
 * Features search, filtering by type (Sale/Rent/Lease), and detailed view.
 */
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

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType]);

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
    let clean = name.replace(/^(Black & White - |Color - |Combined - )/i, '');
    // Remove serial number patterns like (SN-...) or - SN-... or (Serial...)
    clean = clean.replace(/(\s*-\s*SN-[^,]+|\s*\(SN-[^)]+\)|\s*\(Serial[^)]+\))/gi, '');

    // Also remove everything after the last dash if it looks like a serial number (legacy format)
    const lastDashIndex = clean.lastIndexOf(' - ');
    if (lastDashIndex !== -1 && clean.length - lastDashIndex < 25) {
      // Heuristic: if there's a dash and the suffix is short, it's likely a serial number
      clean = clean.substring(0, lastDashIndex).trim();
    }
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

  const aggregateTotal = filteredInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-primary">Orders Overview</h2>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">
              Total Amount
            </p>
            <p className="text-xl font-black text-primary tracking-tight">
              QAR{' '}
              {aggregateTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Coins size={20} />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Search Orders
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by ID, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Filter by Type
            </label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-9 text-xs w-full bg-background border-gray-200">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                <SelectItem value="Sale">Sale</SelectItem>
                <SelectItem value="Rental">Rental</SelectItem>
                <SelectItem value="Lease">Lease</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Actions
            </label>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="h-9 text-xs w-full justify-center gap-2 border-gray-200 hover:bg-gray-50"
            >
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border p-4">
        <div className="overflow-x-auto mb-4">
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
                <TableHead className="text-primary font-bold whitespace-nowrap text-center">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                    No orders found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvoices.map((invoice, index) => (
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
                      QAR {invoice.totalAmount.toLocaleString()}
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
        {totalPages > 1 && (
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        )}
      </div>

      {detailsOpen && selectedInvoice && (
        <InvoiceDetailsDialog
          invoice={selectedInvoice}
          onClose={() => setDetailsOpen(false)}
          mode={mode}
          approveLabel={mode === 'EMPLOYEE' ? 'Send for Finance Approval' : 'Approve'}
          onApprove={async () => {
            if (mode === 'EMPLOYEE') {
              try {
                const { employeeApproveInvoice } = await import('@/lib/invoice');
                await employeeApproveInvoice(selectedInvoice.id);
                toast.success('Sent for Finance Approval');
                setDetailsOpen(false);
                // Simple refresh for now
                window.location.reload();
              } catch (error) {
                console.error(error);
                toast.error('Failed to send for approval');
              }
            } else {
              // FINANCE Appprove
              try {
                const { financeApproveInvoice } = await import('@/lib/invoice');
                await financeApproveInvoice(selectedInvoice.id, {});
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
