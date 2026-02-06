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
import { useState, useEffect } from 'react';
import { getBranchInvoices, Invoice } from '@/lib/invoice';

export default function SalesSummaryTable() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const data = await getBranchInvoices();
        setInvoices(data);
      } catch (error) {
        console.error('Failed to fetch branch invoices:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-sm w-full h-64 flex items-center justify-center">
        <p className="text-primary/60">Loading sales data...</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-sm w-full h-64 flex items-center justify-center">
        <p className="text-primary/60">No sales data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card p-2 sm:p-4 shadow-sm w-full h-full flex flex-col border border-primary/10 overflow-hidden">
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
            {invoices.map((invoice) => (
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
                  ₹{invoice.totalAmount.toLocaleString()}
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
            ))}
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
