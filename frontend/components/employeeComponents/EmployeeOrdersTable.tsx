'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
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

type SaleOrder = {
  billId: string;
  productId: string;
  name: string;
  modelNo: string;
  sellingType: 'Sale' | 'Rent' | 'Lease';
  employeeId: string;
  status: 'Delivered' | 'Pending' | 'Cancelled' | 'Shipped' | 'Processing';
  date: string;
};

const initialOrders: SaleOrder[] = [
  {
    billId: 'BILL-1001',
    productId: 'PROD-101',
    name: 'HP Ink Tank 415',
    modelNo: 'NK-AM-2024',
    sellingType: 'Sale',
    employeeId: 'EMP-001',
    status: 'Delivered',
    date: '2024-01-15',
  },
  {
    billId: 'BILL-1002',
    productId: 'PROD-102',
    name: 'Canon PIXMA G2012',
    modelNo: 'AD-UB-2023',
    sellingType: 'Rent',
    employeeId: 'EMP-002',
    status: 'Pending',
    date: '2024-01-16',
  },
  {
    billId: 'BILL-1003',
    productId: 'PROD-103',
    name: 'HP Smart Tank 670',
    modelNo: 'PM-RS-2024',
    sellingType: 'Lease',
    employeeId: 'EMP-003',
    status: 'Cancelled',
    date: '2024-01-14',
  },
  {
    billId: 'BILL-1004',
    productId: 'PROD-104',
    name: 'Ricoh SP 230DNw',
    modelNo: 'RB-CL-2023',
    sellingType: 'Sale',
    employeeId: 'EMP-001',
    status: 'Shipped',
    date: '2024-01-13',
  },
  {
    billId: 'BILL-1005',
    productId: 'PROD-105',
    name: 'Kyocera ECOSYS P2040dn',
    modelNo: 'NB-574-2024',
    sellingType: 'Rent',
    employeeId: 'EMP-004',
    status: 'Processing',
    date: '2024-01-16',
  },
];

export default function EmployeeOrdersTable() {
  const [orders] = useState<SaleOrder[]>(initialOrders);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('All');

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = Object.values(order).some((value) =>
      value.toLowerCase().includes(search.toLowerCase()),
    );
    const matchesFilter = filterType === 'All' || order.sellingType === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-white border-blue-400/60 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm transition-all"
          />
        </div>

        <div className="w-full sm:w-[150px]">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-10 bg-white border-blue-400/60 focus:ring-blue-100 rounded-lg">
              <SelectValue placeholder="Filter by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              <SelectItem value="Sale">Sale</SelectItem>
              <SelectItem value="Rent">Rent</SelectItem>
              <SelectItem value="Lease">Lease</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-primary font-bold">BILL ID</TableHead>
              <TableHead className="text-primary font-bold">PRODUCT ID</TableHead>
              <TableHead className="text-primary font-bold">NAME</TableHead>
              <TableHead className="text-primary font-bold">MODEL NO</TableHead>
              <TableHead className="text-primary font-bold">SELLING TYPE</TableHead>
              <TableHead className="text-primary font-bold">STATUS</TableHead>
              <TableHead className="text-primary font-bold">DATE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order, index) => (
              <TableRow key={order.billId} className={index % 2 ? 'bg-sky-100/60' : ''}>
                <TableCell className="text-blue-400 font-medium">{order.billId}</TableCell>
                <TableCell className="text-gray-500">{order.productId}</TableCell>
                <TableCell className="font-bold text-primary">{order.name}</TableCell>
                <TableCell className="text-gray-500">{order.modelNo}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                    ${
                      order.sellingType === 'Sale'
                        ? 'bg-blue-100 text-blue-600'
                        : order.sellingType === 'Rent'
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-purple-100 text-purple-600'
                    }`}
                  >
                    {order.sellingType}
                  </span>
                </TableCell>

                <TableCell>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                    ${
                      order.status === 'Delivered'
                        ? 'bg-green-100 text-green-600'
                        : order.status === 'Pending'
                          ? 'bg-yellow-100 text-yellow-600'
                          : order.status === 'Cancelled'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    {order.status}
                  </span>
                </TableCell>
                <TableCell className="text-gray-500">{order.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
