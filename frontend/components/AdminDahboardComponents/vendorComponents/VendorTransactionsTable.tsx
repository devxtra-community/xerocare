'use client';
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, User, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { VendorRequest } from '@/lib/vendor';

interface VendorTransactionsTableProps {
  requests: VendorRequest[];
  loading: boolean;
}

/**
 * Table displaying vendor transaction history with pagination.
 * Shows request details, purchase values, requesting branch, manager info, and status.
 * Provides a transparency log for all vendor interactions.
 */
export default function VendorTransactionsTable({
  requests,
  loading,
}: VendorTransactionsTableProps) {
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const totalPages = Math.ceil(requests.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const currentData = requests.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-primary">
        <Loader2 className="animate-spin mr-2" /> Loading transaction history...
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <FileText className="h-8 w-8 mb-2 opacity-20" />
        <p className="text-sm">No transaction history found</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
      <div className="overflow-x-auto flex-1">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-blue-50/30">
              <TableHead className="text-[10px] font-bold text-primary uppercase px-4 py-4">
                Date
              </TableHead>
              <TableHead className="text-[10px] font-bold text-primary uppercase px-4 py-4">
                Items Requested
              </TableHead>
              <TableHead className="text-[10px] font-bold text-primary uppercase px-4 py-4">
                Purchase Value
              </TableHead>
              <TableHead className="text-[10px] font-bold text-primary uppercase px-4 py-4">
                Branch
              </TableHead>
              <TableHead className="text-[10px] font-bold text-primary uppercase px-4 py-4">
                Manager
              </TableHead>
              <TableHead className="text-[10px] font-bold text-primary uppercase px-4 py-4 text-center">
                Status
              </TableHead>
              <TableHead className="text-[10px] font-bold text-primary uppercase px-4 py-4 text-right pr-6">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((item, index) => (
              <TableRow
                key={item.id}
                className={`hover:bg-blue-50/20 transition-colors border-b border-gray-50 ${
                  index % 2 ? 'bg-blue-50/10' : 'bg-card'
                }`}
              >
                <TableCell className="px-4 py-4 text-xs font-medium text-foreground whitespace-nowrap">
                  {format(new Date(item.created_at), 'dd MMM yyyy')}
                </TableCell>
                <TableCell className="px-4 py-4 text-xs text-gray-700 max-w-[200px] truncate font-medium">
                  {item.products}
                </TableCell>
                <TableCell className="px-4 py-4 text-xs font-bold text-primary">
                  {item.total_amount ? `₹${item.total_amount.toLocaleString()}` : '-'}
                </TableCell>
                <TableCell className="px-4 py-4 text-xs">
                  <div className="flex items-center gap-1.5 text-blue-700 font-semibold bg-blue-50/50 px-2 py-1 rounded-md w-fit">
                    <Building2 size={12} />
                    {item.branch?.name || 'Main Branch'}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4 text-xs">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 flex items-center gap-1">
                      <User size={12} className="text-blue-500" />
                      {item.manager?.name || 'Manager'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {item.manager?.email || '-'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4 text-center">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-tight">
                    Sent
                  </span>
                </TableCell>
                <TableCell className="px-4 py-4 text-right pr-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-400 hover:text-primary hover:bg-blue-50"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-50 flex items-center justify-between bg-card mt-auto">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 px-3 text-[11px] rounded-lg border-blue-100 text-blue-700 hover:bg-blue-50 font-bold"
            >
              PREVIOUS
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 px-3 text-[11px] rounded-lg border-blue-100 text-blue-700 hover:bg-blue-50 font-bold"
            >
              NEXT
            </Button>
          </div>
          <span className="text-[11px] text-blue-400 font-bold uppercase tracking-wider">
            Page {page} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
