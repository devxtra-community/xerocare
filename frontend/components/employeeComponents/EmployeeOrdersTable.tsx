'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Edit } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import OrderUpdateDialog, { SaleOrder } from './OrderUpdateDialog';

const initialOrders: SaleOrder[] = [
  {
    orderId: 'ORD-1001',
    customerName: 'John Doe',
    customerPhone: '+91 98765 43210',
    orderDate: '2024-01-15',
    productName: 'HP Ink Tank 415',
    quantity: 1,
    totalAmount: '₹12,499',
    paymentStatus: 'Paid',
    orderStatus: 'Delivered',
    deliveryType: 'Sale',
  },
  {
    orderId: 'ORD-1002',
    customerName: 'Jane Smith',
    customerPhone: '+91 87654 32109',
    orderDate: '2024-01-16',
    productName: 'Canon PIXMA G2012',
    quantity: 2,
    totalAmount: '₹21,000',
    paymentStatus: 'Pending',
    orderStatus: 'New',
    deliveryType: 'Rental',
  },
  {
    orderId: 'ORD-1003',
    customerName: 'Michael Brown',
    customerPhone: '+91 76543 21098',
    orderDate: '2024-01-14',
    productName: 'HP Smart Tank 670',
    quantity: 1,
    totalAmount: '₹18,500',
    paymentStatus: 'Partial',
    orderStatus: 'Processing',
    deliveryType: 'Lease',
  },
  {
    orderId: 'ORD-1004',
    customerName: 'Sarah Wilson',
    customerPhone: '+91 65432 10987',
    orderDate: '2024-01-13',
    productName: 'Ricoh SP 230DNw',
    quantity: 1,
    totalAmount: '₹14,200',
    paymentStatus: 'Paid',
    orderStatus: 'Shipped',
    deliveryType: 'Sale',
  },
  {
    orderId: 'ORD-1005',
    customerName: 'David Lee',
    customerPhone: '+91 54321 09876',
    orderDate: '2024-01-16',
    productName: 'Kyocera ECOSYS P2040dn',
    quantity: 1,
    totalAmount: '₹28,600',
    paymentStatus: 'Pending',
    orderStatus: 'New',
    deliveryType: 'Rental',
  },
];

export default function EmployeeOrdersTable() {
  const [orders, setOrders] = useState<SaleOrder[]>(initialOrders);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [selectedOrder, setSelectedOrder] = useState<SaleOrder | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = Object.values(order).some((value) =>
      value.toString().toLowerCase().includes(search.toLowerCase()),
    );
    const matchesFilter = filterType === 'All' || order.deliveryType === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleUpdateClick = (order: SaleOrder) => {
    setSelectedOrder(order);
    setIsDialogOpen(true);
  };

  const handleUpdateOrder = (updatedOrder: SaleOrder) => {
    setOrders((prev) => prev.map((o) => (o.orderId === updatedOrder.orderId ? updatedOrder : o)));
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
                <SelectItem value="Rental">Rental</SelectItem>
                <SelectItem value="Lease">Lease</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden border">
        <div className="overflow-x-auto">
          <Table className="min-w-[1000px] sm:min-w-full">
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-primary font-bold whitespace-nowrap">Order ID</TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">
                  Customer Name
                </TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">Phone</TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">
                  Order Date
                </TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">Product</TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap text-center">
                  Qty
                </TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">Amount</TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">Payment</TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">Status</TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">Type</TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap text-center">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                    No orders found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order, index) => (
                  <TableRow
                    key={order.orderId}
                    className={index % 2 !== 0 ? 'bg-blue-50/20' : 'bg-white'}
                  >
                    <TableCell className="text-blue-600 font-medium whitespace-nowrap">
                      {order.orderId}
                    </TableCell>
                    <TableCell className="font-bold text-primary whitespace-nowrap">
                      {order.customerName}
                    </TableCell>
                    <TableCell className="text-slate-500 whitespace-nowrap text-xs">
                      {order.customerPhone}
                    </TableCell>
                    <TableCell className="text-slate-500 whitespace-nowrap text-xs">
                      {order.orderDate}
                    </TableCell>
                    <TableCell className="text-primary font-medium whitespace-nowrap">
                      {order.productName}
                    </TableCell>
                    <TableCell className="text-center font-medium">{order.quantity}</TableCell>
                    <TableCell className="font-bold text-primary whitespace-nowrap">
                      {order.totalAmount}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                        ${
                          order.paymentStatus === 'Paid'
                            ? 'bg-green-100 text-green-600'
                            : order.paymentStatus === 'Pending'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-yellow-100 text-yellow-600'
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                        ${
                          order.orderStatus === 'Delivered'
                            ? 'bg-green-100 text-green-600'
                            : order.orderStatus === 'New'
                              ? 'bg-blue-100 text-blue-600'
                              : order.orderStatus === 'Cancelled'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-yellow-100 text-yellow-600'
                        }`}
                      >
                        {order.orderStatus}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                        ${
                          order.deliveryType === 'Sale'
                            ? 'bg-blue-100 text-blue-600'
                            : order.deliveryType === 'Rental'
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-purple-100 text-purple-600'
                        }`}
                      >
                        {order.deliveryType}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateClick(order)}
                          className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <OrderUpdateDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        order={selectedOrder}
        onUpdate={handleUpdateOrder}
      />
    </div>
  );
}
