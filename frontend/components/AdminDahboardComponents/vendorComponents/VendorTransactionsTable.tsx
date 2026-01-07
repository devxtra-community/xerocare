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
import { FileText } from 'lucide-react';

const transactionData = [
  {
    id: 'TXN-001',
    date: '2023-12-25',
    type: 'Purchase',
    amount: 150000,
    status: 'Completed',
    paymentMethod: 'Bank Transfer',
  },
  {
    id: 'TXN-002',
    date: '2023-12-20',
    type: 'Return',
    amount: 12000,
    status: 'Refunded',
    paymentMethod: 'Credit Note',
  },
  {
    id: 'TXN-003',
    date: '2023-12-15',
    type: 'Purchase',
    amount: 85000,
    status: 'Pending',
    paymentMethod: 'UPI',
  },
  {
    id: 'TXN-004',
    date: '2023-12-10',
    type: 'Purchase',
    amount: 220000,
    status: 'Completed',
    paymentMethod: 'Bank Transfer',
  },
  {
    id: 'TXN-005',
    date: '2023-12-05',
    type: 'Purchase',
    amount: 45000,
    status: 'Cancelled',
    paymentMethod: 'Cash',
  },
];

export default function VendorTransactionsTable() {
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(transactionData.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const currentData = transactionData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
      <div className="overflow-x-auto flex-1">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] font-semibold text-blue-900 uppercase px-4 py-3">
                ID
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-blue-900 uppercase px-4 py-3">
                Date
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-blue-900 uppercase px-4 py-3">
                Type
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-blue-900 uppercase px-4 py-3 text-right">
                Amount
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-blue-900 uppercase px-4 py-3 text-center">
                Status
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-blue-900 uppercase px-4 py-3 text-right pr-6">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((item, index) => (
              <TableRow
                key={item.id}
                className={`hover:bg-gray-50/30 transition-colors ${index % 2 ? 'bg-sky-100/60' : ''}`}
              >
                <TableCell className="px-4 py-3 text-xs font-medium text-gray-900">
                  {item.id}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs text-gray-600">{item.date}</TableCell>
                <TableCell className="px-4 py-3 text-xs text-gray-600">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      item.type === 'Purchase'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-purple-50 text-purple-700'
                    }`}
                  >
                    {item.type}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-xs text-right font-bold text-gray-900">
                  ₹{item.amount.toLocaleString()}
                </TableCell>
                <TableCell className="px-4 py-3 text-center">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      item.status === 'Completed'
                        ? 'bg-green-100 text-green-700'
                        : item.status === 'Pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : item.status === 'Refunded'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.status}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-right pr-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-400 hover:text-primary"
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="p-3 border-t border-gray-50 flex items-center justify-between bg-white mt-auto">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-7 px-2 text-[10px] rounded-lg border-blue-100 text-blue-700 hover:bg-blue-50"
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="h-7 px-2 text-[10px] rounded-lg border-blue-100 text-blue-700 hover:bg-blue-50"
          >
            Next
          </Button>
        </div>
        <span className="text-[10px] text-gray-500">
          Page {page} of {totalPages}
        </span>
      </div>
    </div>
  );
}
