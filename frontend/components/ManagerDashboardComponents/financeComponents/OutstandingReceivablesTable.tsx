'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const data = [
  {
    customer: 'Tech Corp Systems',
    invoice: 'INV-2024-001',
    date: '2024-03-01',
    due: '2024-03-31',
    amount: '₹12,500',
    paid: '₹0',
    balance: '₹12,500',
    aging: '0–30 days',
    status: 'Pending',
  },
  {
    customer: 'Green Valley Ltd',
    invoice: 'INV-2023-452',
    date: '2023-12-15',
    due: '2024-01-15',
    amount: '₹28,400',
    paid: '₹10,000',
    balance: '₹18,400',
    aging: '60+ days',
    status: 'Overdue',
  },
  {
    customer: 'Apex Innovations',
    invoice: 'INV-2024-012',
    date: '2024-02-10',
    due: '2024-03-10',
    amount: '₹45,000',
    paid: '₹25,000',
    balance: '₹20,000',
    aging: '31–60 days',
    status: 'Partial',
  },
  {
    customer: 'Horizon Media',
    invoice: 'INV-2024-035',
    date: '2024-03-20',
    due: '2024-04-20',
    amount: '₹15,200',
    paid: '₹0',
    balance: '₹15,200',
    aging: '0–30 days',
    status: 'Pending',
  },
];

export default function OutstandingReceivablesTable() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="text-[11px] font-bold text-primary uppercase py-4 px-4 whitespace-nowrap">
                Customer Name
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary uppercase whitespace-nowrap">
                Invoice No
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary uppercase whitespace-nowrap">
                Date
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary uppercase whitespace-nowrap">
                Due Date
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary uppercase whitespace-nowrap">
                Amount
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary uppercase whitespace-nowrap">
                Paid
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary uppercase whitespace-nowrap">
                Balance
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary uppercase whitespace-nowrap">
                Aging
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary uppercase whitespace-nowrap">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow
                key={i}
                className={`hover:bg-blue-50/30 transition-colors ${i % 2 ? 'bg-sky-50/40' : ''}`}
              >
                <TableCell className="text-xs font-bold text-gray-900 px-4 whitespace-nowrap">
                  {row.customer}
                </TableCell>
                <TableCell className="text-xs font-medium text-blue-600 whitespace-nowrap">
                  {row.invoice}
                </TableCell>
                <TableCell className="text-xs font-medium text-gray-500 whitespace-nowrap">
                  {row.date}
                </TableCell>
                <TableCell className="text-xs font-medium text-gray-500 whitespace-nowrap">
                  {row.due}
                </TableCell>
                <TableCell className="text-xs font-bold text-gray-900 whitespace-nowrap">
                  {row.amount}
                </TableCell>
                <TableCell className="text-xs font-bold text-green-600 whitespace-nowrap">
                  {row.paid}
                </TableCell>
                <TableCell className="text-xs font-bold text-red-600 whitespace-nowrap">
                  {row.balance}
                </TableCell>
                <TableCell className="text-xs font-bold text-orange-600 whitespace-nowrap">
                  {row.aging}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                    ${
                      row.status === 'Overdue'
                        ? 'bg-red-100 text-red-700'
                        : row.status === 'Partial'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {row.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
