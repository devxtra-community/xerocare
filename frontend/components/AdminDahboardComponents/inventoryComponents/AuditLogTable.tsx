'use client';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const auditData = [
  {
    id: 1,
    date: 'Oct 27, 10:30 AM',
    product: 'Surgical Gloves',
    action: 'IN',
    qty: '+500',
    fromTo: 'Vendor -> Main Wh.',
    user: 'John Doe',
  },
  {
    id: 2,
    date: 'Oct 27, 11:15 AM',
    product: 'N95 Masks',
    action: 'OUT',
    qty: '-50',
    fromTo: 'Main Wh. -> ER',
    user: 'Jane Smith',
  },
  {
    id: 3,
    date: 'Oct 26, 09:00 AM',
    product: 'Paracetamol',
    action: 'TRANSFER',
    qty: '200',
    fromTo: 'Main -> Downtown',
    user: 'Mike Ross',
  },
  {
    id: 4,
    date: 'Oct 25, 04:45 PM',
    product: 'Bandages',
    action: 'ADJUSTMENT',
    qty: '-5',
    fromTo: 'East Wing',
    user: 'Admin',
  },
  {
    id: 5,
    date: 'Oct 25, 02:20 PM',
    product: 'Surgical Gloves',
    action: 'OUT',
    qty: '-100',
    fromTo: 'Main -> Surgery',
    user: 'Sarah Lee',
  },
];

/**
 * Table displaying detailed inventory audit logs.
 * Tracks product movements (IN/OUT/TRANSFER), adjustments, and the user responsible for each action.
 * Provides transparency and accountability for stock changes.
 */
export default function AuditLogTable() {
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(auditData.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const currentData = auditData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="rounded-2xl bg-card p-2 sm:p-3 shadow-sm w-full min-h-[260px] flex flex-col">
      <div className="flex-1 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                DATE
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                PRODUCT
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                ACTION
              </TableHead>
              <TableHead className="text-center text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                QTY
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                DETAILS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((item, index) => (
              <TableRow
                key={item.id}
                className={`border-none ${index % 2 === 1 ? 'bg-blue-50/20' : 'bg-card'}`}
              >
                <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-muted-foreground">
                  {item.date}
                </TableCell>
                <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-medium text-foreground">
                  {item.product}
                </TableCell>
                <TableCell
                  className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-bold"
                  style={{
                    color:
                      item.action === 'IN'
                        ? '#16a34a'
                        : item.action === 'OUT'
                          ? '#dc2626'
                          : item.action === 'TRANSFER'
                            ? '#2563eb'
                            : '#d97706',
                  }}
                >
                  {item.action}
                </TableCell>
                <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-center font-bold text-gray-700">
                  {item.qty}
                </TableCell>
                <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-600">
                  {item.fromTo}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-2 sm:mt-3 flex items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs flex-shrink-0">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="rounded-md border px-1.5 sm:px-2 py-0.5 disabled:opacity-40 hover:bg-muted/50 transition"
        >
          &lt;
        </button>
        <span className="text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="rounded-md border px-1.5 sm:px-2 py-0.5 disabled:opacity-40 hover:bg-muted/50 transition"
        >
          &gt;
        </button>
      </div>
    </div>
  );
}
