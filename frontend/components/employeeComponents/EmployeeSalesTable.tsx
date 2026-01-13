'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
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

export default function EmployeeSalesTable() {
  const [orders, setOrders] = useState<SaleOrder[]>(initialOrders);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SaleOrder | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('All');

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = Object.values(order).some((value) =>
      value.toLowerCase().includes(search.toLowerCase()),
    );
    const matchesFilter = filterType === 'All' || order.sellingType === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleSave = (data: SaleOrder) => {
    setOrders((prev) => {
      const exists = prev.find((o) => o.billId === data.billId);
      if (exists && editing) {
        return prev.map((o) => (o.billId === data.billId ? data : o));
      } else {
        return [data, ...prev];
      }
    });
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-white border-blue-400/60 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm transition-all w-full"
            />
          </div>
          <div className="w-full sm:w-[150px]">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-10 bg-white border-blue-400/60 focus:ring-blue-100 rounded-lg w-full">
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
        <Button
          className="bg-primary text-white gap-2 w-full sm:w-auto mt-2 sm:mt-0"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus size={16} /> Add Sale
        </Button>
      </div>

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px] sm:min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="text-primary font-bold">BILL ID</TableHead>
                <TableHead className="text-primary font-bold">PRODUCT ID</TableHead>
                <TableHead className="text-primary font-bold">NAME</TableHead>
                <TableHead className="text-primary font-bold">MODEL NO</TableHead>
                <TableHead className="text-primary font-bold">SELLING TYPE</TableHead>
                <TableHead className="text-primary font-bold">STATUS</TableHead>
                <TableHead className="text-primary font-bold">DATE</TableHead>
                <TableHead className="text-primary font-bold">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order, index) => (
                <TableRow key={order.billId} className={index % 2 ? 'bg-blue-50/20' : 'bg-white'}>
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
                  <TableCell>
                    <button
                      className="text-primary hover:underline text-sm font-medium"
                      onClick={() => {
                        setEditing(order);
                        setFormOpen(true);
                      }}
                    >
                      Update
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {formOpen && (
        <SaleFormModal
          initialData={editing}
          onClose={() => setFormOpen(false)}
          onConfirm={handleSave}
        />
      )}
    </div>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function SaleFormModal({
  initialData,
  onClose,
  onConfirm,
}: {
  initialData: SaleOrder | null;
  onClose: () => void;
  onConfirm: (data: SaleOrder) => void;
}) {
  const [form, setForm] = useState<SaleOrder>(
    () =>
      initialData ?? {
        billId: `BILL-${Math.floor(Math.random() * 10000)}`,
        productId: '',
        name: '',
        modelNo: '',
        sellingType: 'Sale',
        employeeId: '',
        status: 'Pending',
        date: new Date().toISOString().split('T')[0],
      },
  );

  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary">
            {initialData ? 'Update Sale' : 'Add Sale'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <div className="col-span-1 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Running Bill ID
              </label>
              <Input
                value={form.billId}
                onChange={(e) => setForm({ ...form, billId: e.target.value })}
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="col-span-1 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Product ID
              </label>
              <Input
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Product Name
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="col-span-1 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Model No
              </label>
              <Input
                value={form.modelNo}
                onChange={(e) => setForm({ ...form, modelNo: e.target.value })}
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="col-span-1 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Selling Type
              </label>
              <Select
                value={form.sellingType}
                onValueChange={(v) =>
                  setForm({ ...form, sellingType: v as SaleOrder['sellingType'] })
                }
              >
                <SelectTrigger className="h-12 rounded-xl bg-white border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Sale">Sale</SelectItem>
                  <SelectItem value="Rent">Rent</SelectItem>
                  <SelectItem value="Lease">Lease</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-1 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Date
              </label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Status
              </label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as SaleOrder['status'] })}
              >
                <SelectTrigger className="h-12 rounded-xl bg-white border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Shipped">Shipped</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end items-center gap-6 pt-8">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-bold text-gray-900 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
            <Button
              className="h-12 px-10 rounded-xl bg-[#004a8d] text-white hover:bg-[#003f7d] font-bold shadow-lg"
              onClick={() => onConfirm(form)}
            >
              {initialData ? 'Update' : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
