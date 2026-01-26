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
import { Input } from '@/components/ui/input';
import { Search, User } from 'lucide-react';

const mockOrders = [
  {
    id: 'ORD-1024',
    date: '2024-03-25',
    customer: 'Tech Corp Systems',
    type: 'Sale',
    branch: 'Downtown Branch',
    assigned: 'Arjun Mehta',
    status: 'Delivered',
    amount: '₹45,200',
    payment: 'Paid',
  },
  {
    id: 'ORD-1025',
    date: '2024-03-24',
    customer: 'Green Valley Ltd',
    type: 'Rental',
    branch: 'East Side',
    assigned: 'Suhail Khan',
    status: 'Processing',
    amount: '₹12,800',
    payment: 'Partial',
  },
  {
    id: 'ORD-1026',
    date: '2024-03-24',
    customer: 'Apex Innovations',
    type: 'Lease',
    branch: 'Downtown Branch',
    assigned: 'Priya Sharma',
    status: 'Pending',
    amount: '₹85,000',
    payment: 'Pending',
  },
  {
    id: 'ORD-1027',
    date: '2024-03-23',
    customer: 'Horizon Media',
    type: 'Sale',
    branch: 'West Branch',
    assigned: 'Aditya Rao',
    status: 'Dispatched',
    amount: '₹32,500',
    payment: 'Paid',
  },
  {
    id: 'ORD-1028',
    date: '2024-03-23',
    customer: 'Blue Sky Org',
    type: 'Rental',
    branch: 'Downtown Branch',
    assigned: 'Zoya Ahmed',
    status: 'Completed',
    amount: '₹9,400',
    payment: 'Paid',
  },
];

export default function OrderTable() {
  const [search, setSearch] = useState('');

  const filteredOrders = mockOrders.filter(
    (order) =>
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      order.customer.toLowerCase().includes(search.toLowerCase()) ||
      order.assigned.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search Order ID, Customer, or Assigned..."
            className="pl-10 h-10 bg-white border-blue-400/60 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm rounded-xl transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-blue-50/50 hover:bg-transparent">
                <TableHead className="text-[10px] font-bold text-primary uppercase py-3 px-4">
                  Order Details
                </TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase">
                  Customer
                </TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase">Type</TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase">
                  Assigned To
                </TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase">
                  Amount
                </TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase">
                  Payment
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order, index) => (
                <TableRow
                  key={order.id}
                  className={`hover:bg-blue-50/30 transition-colors border-b border-blue-50/20 ${index % 2 ? 'bg-blue-50/20' : 'bg-white'}`}
                >
                  <TableCell className="px-4 py-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-primary">{order.id}</span>
                      <span className="text-[9px] text-gray-500 font-semibold">{order.date}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-xs font-semibold text-gray-800">{order.customer}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase
                      ${
                        order.type === 'Sale'
                          ? 'bg-blue-100 text-blue-700'
                          : order.type === 'Rental'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {order.type}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-blue-50 flex items-center justify-center">
                        <User className="h-2.5 w-2.5 text-blue-600" />
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{order.assigned}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight
                      ${
                        order.status === 'Completed' || order.status === 'Delivered'
                          ? 'bg-green-100 text-green-700'
                          : order.status === 'Cancelled'
                            ? 'bg-red-100 text-red-700'
                            : order.status === 'Pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      <span
                        className={`h-1 w-1 rounded-full ${
                          order.status === 'Completed' || order.status === 'Delivered'
                            ? 'bg-green-600'
                            : order.status === 'Cancelled'
                              ? 'bg-red-600'
                              : order.status === 'Pending'
                                ? 'bg-yellow-600'
                                : 'bg-blue-600'
                        }`}
                      />
                      {order.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-primary py-2">
                    {order.amount}
                  </TableCell>
                  <TableCell className="py-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase
                      ${
                        order.payment === 'Paid'
                          ? 'bg-green-100 text-green-700'
                          : order.payment === 'Partial'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {order.payment}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
