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
    date: '2024-03-25',
    type: 'Sales',
    count: 12,
    total: '₹45,200',
    paid: '₹45,200',
    pending: '₹0',
  },
  {
    date: '2024-03-24',
    type: 'Rental',
    count: 8,
    total: '₹12,800',
    paid: '₹8,000',
    pending: '₹4,800',
  },
  {
    date: '2024-03-24',
    type: 'Lease',
    count: 3,
    total: '₹85,000',
    paid: '₹40,000',
    pending: '₹45,000',
  },
  {
    date: '2024-03-23',
    type: 'Service',
    count: 15,
    total: '₹22,500',
    paid: '₹22,500',
    pending: '₹0',
  },
  { date: '2024-03-22', type: 'Sales', count: 9, total: '₹31,400', paid: '₹31,400', pending: '₹0' },
];

export default function RevenueSummaryTable() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow>
            <TableHead className="text-[11px] font-bold text-primary uppercase py-4 px-4">
              Date
            </TableHead>
            <TableHead className="text-[11px] font-bold text-primary uppercase">
              Revenue Type
            </TableHead>
            <TableHead className="text-[11px] font-bold text-primary uppercase text-center">
              Invoices
            </TableHead>
            <TableHead className="text-[11px] font-bold text-primary uppercase">
              Total Amount
            </TableHead>
            <TableHead className="text-[11px] font-bold text-primary uppercase">Paid</TableHead>
            <TableHead className="text-[11px] font-bold text-primary uppercase">Pending</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow
              key={i}
              className={`hover:bg-blue-50/30 transition-colors ${i % 2 ? 'bg-blue-50/20' : 'bg-white'}`}
            >
              <TableCell className="text-xs font-medium text-gray-600 px-4">{row.date}</TableCell>
              <TableCell>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                  ${
                    row.type === 'Sales'
                      ? 'bg-blue-100 text-blue-700'
                      : row.type === 'Rental'
                        ? 'bg-purple-100 text-purple-700'
                        : row.type === 'Lease'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                  }`}
                >
                  {row.type}
                </span>
              </TableCell>
              <TableCell className="text-xs font-bold text-primary text-center">
                {row.count}
              </TableCell>
              <TableCell className="text-xs font-bold text-gray-900">{row.total}</TableCell>
              <TableCell className="text-xs font-bold text-green-600">{row.paid}</TableCell>
              <TableCell
                className={`text-xs font-bold ${row.pending !== '₹0' ? 'text-red-600' : 'text-gray-400'}`}
              >
                {row.pending}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
