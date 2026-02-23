'use client';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { getBranchInvoices, Invoice } from '@/lib/invoice';

/**
 * Table component displaying a summary of recent sales transactions.
 * Fetches and lists invoices with details like invoice number, customer, sale type, amount, employee, status, and date.
 * Highlights payment status with color-coded badges.
 */
export default function SalesSummaryTable({ selectedYear }: { selectedYear: number | 'all' }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saleTypeFilter, setSaleTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const data = await getBranchInvoices();
        // Filter by year if not 'all'
        const filteredByYear = data.filter((inv) => {
          if (selectedYear === 'all') return true;
          const date = new Date(inv.createdAt);
          return date.getFullYear() === selectedYear;
        });
        setInvoices(filteredByYear);
      } catch (error) {
        console.error('Failed to fetch branch invoices:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [selectedYear]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-sm w-full h-64 flex items-center justify-center">
        <p className="text-primary/60">Loading sales data...</p>
      </div>
    );
  }

  // Filter invoices based on search and filters
  const filteredInvoices = invoices.filter((invoice) => {
    // Search filter
    const searchLower = search.toLowerCase();
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
      (invoice.customerName || '').toLowerCase().includes(searchLower) ||
      (invoice.employeeName || '').toLowerCase().includes(searchLower);

    // Sale type filter
    const matchesSaleType = saleTypeFilter === 'all' || invoice.saleType === saleTypeFilter;

    // Status filter
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

    return matchesSearch && matchesSaleType && matchesStatus;
  });

  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-sm w-full h-64 flex items-center justify-center">
        <p className="text-primary/60">No sales data available</p>
      </div>
    );
  }
  const formatToK = (value: number) => {
    if (value >= 1000) {
      return `QAR ${(value / 1000).toFixed(1)}k`;
    }
    return `QAR ${value.toLocaleString()}`;
  };

  return (
    <div className="rounded-2xl bg-card p-2 sm:p-4 shadow-sm w-full h-full flex flex-col border border-primary/10 overflow-hidden">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by invoice, customer, or employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 border-blue-100 focus:border-blue-400 focus:ring-blue-50"
          />
        </div>
        <Select value={saleTypeFilter} onValueChange={setSaleTypeFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-10">
            <SelectValue placeholder="Sale Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="SALE">Sale</SelectItem>
            <SelectItem value="RENT">Rent</SelectItem>
            <SelectItem value="LEASE">Lease</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="FINANCE_APPROVED">Finance Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Scrollable Container with Custom Slider Styling */}
      <div className="flex-1 overflow-x-auto custom-scrollbar pb-2">
        <Table className="min-w-[900px] border-collapse relative">
          <TableHeader>
            <TableRow className="border-b border-primary/10 hover:bg-transparent">
              <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2 w-[120px]">
                Invoice Number
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2 w-[100px]">
                Customer
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2 w-[80px]">
                Sale Type
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2 w-[80px]">
                Amount
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2 w-[100px]">
                Employee
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2 w-[90px]">
                Status
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2 w-[80px]">
                Date
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className="hover:bg-primary/5 transition-colors border-b border-primary/5"
                >
                  <TableCell className="py-3 px-2 text-[10px] sm:text-sm font-semibold text-primary">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell className="py-3 px-2 text-[10px] sm:text-sm text-primary/80">
                    {invoice.customerName || 'N/A'}
                  </TableCell>
                  <TableCell className="py-3 px-2">
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/15 border-primary/20 text-[10px] px-2 py-0.5 pointer-events-none">
                      {invoice.saleType}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 px-2 text-[10px] sm:text-sm font-bold text-primary">
                    {formatToK(invoice.totalAmount)}
                  </TableCell>
                  <TableCell className="py-3 px-2 text-[10px] sm:text-sm text-primary/80">
                    {invoice.employeeName || 'N/A'}
                  </TableCell>
                  <TableCell className="py-3 px-2">
                    <Badge
                      variant={invoice.status === 'PAID' ? 'default' : 'secondary'}
                      className={`text-[10px] px-2 py-0.5 pointer-events-none ${
                        invoice.status === 'PAID'
                          ? 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200'
                          : invoice.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200'
                            : invoice.status === 'DRAFT'
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-border'
                              : 'bg-primary/10 text-primary hover:bg-primary/15 border-primary/20'
                      }`}
                    >
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 px-2 text-[10px] sm:text-sm text-primary/80">
                    {new Date(invoice.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="bg-gray-100 p-3 rounded-full">
                      <span className="text-2xl">🔍</span>
                    </div>
                    <p className="font-medium">No sales found</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: oklch(var(--muted));
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: oklch(var(--primary));
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: oklch(var(--primary) / 0.8);
        }
      `}</style>
    </div>
  );
}
