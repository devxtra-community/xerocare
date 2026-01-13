'use client';

import React, { useState } from 'react';
import { Search, Filter, Download, Phone, Mail, Plus, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import CustomerFormDialog, { Customer } from './CustomerFormDialog';

// Mock Data
const initialCustomers: Customer[] = [
  {
    id: 'CUST-001',
    name: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    phone: '+1234567890',
    image: '',
    totalPurchase: 12500,
    source: 'LEAD',
    createdAt: '2025-10-12',
    status: 'ACTIVE',
  },
  {
    id: 'CUST-002',
    name: 'Michael Chen',
    email: 'm.chen@example.com',
    phone: '+1987654321',
    image: '',
    totalPurchase: 8900,
    source: 'DIRECT',
    createdAt: '2025-11-05',
    status: 'ACTIVE',
  },
  {
    id: 'CUST-003',
    name: 'Emma Wilson',
    email: 'emma.w@example.com',
    phone: '+1122334455',
    image: '',
    totalPurchase: 45000,
    source: 'LEAD',
    createdAt: '2025-09-22',
    status: 'ACTIVE',
  },
  {
    id: 'CUST-004',
    name: 'James Rodriguez',
    email: 'j.rodriguez@example.com',
    phone: '+1555666777',
    image: '',
    totalPurchase: 2100,
    source: 'DIRECT',
    createdAt: '2025-12-01',
    status: 'INACTIVE',
  },
  {
    id: 'CUST-005',
    name: 'Linda Kim',
    email: 'linda.k@example.com',
    phone: '+1999888777',
    image: '',
    totalPurchase: 15600,
    source: 'LEAD',
    createdAt: '2025-08-15',
    status: 'ACTIVE',
  },
];

export default function EmployeeCustomerTable() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchTerm, setSearchTerm] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setDialogOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  const handleFormSubmit = (data: Partial<Customer>) => {
    if (selectedCustomer) {
      // Update existing
      setCustomers((prev) =>
        prev.map((c) => (c.id === selectedCustomer.id ? ({ ...c, ...data } as Customer) : c)),
      );
    } else {
      // Add new
      const newCustomer: Customer = {
        ...(data as Customer),
        id: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
        createdAt: new Date().toISOString(),
        image: '',
      };
      setCustomers((prev) => [newCustomer, ...prev]);
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-primary">All Customers</h3>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">
            {customers.length} Total
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search customers..."
              className="pl-9 h-10 bg-white border-blue-400/60 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm transition-all w-full md:w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            className="h-10 rounded-lg border-blue-400/60 hover:bg-blue-50 text-primary"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button
            variant="outline"
            className="h-10 rounded-lg border-blue-400/60 hover:bg-blue-50 text-primary"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={handleAddCustomer}
            className="h-10 rounded-lg bg-primary hover:bg-primary/90 text-white shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-primary font-bold whitespace-nowrap">
                  Customer ID
                </TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">
                  Customer Name
                </TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">
                  Total Purchase
                </TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">Source</TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">
                  Created At
                </TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap text-right pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No customers found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer, index) => (
                  <TableRow key={customer.id} className={index % 2 ? 'bg-blue-50/20' : 'bg-white'}>
                    <TableCell className="font-bold text-blue-600 whitespace-nowrap">
                      <span className="bg-blue-50 px-2 py-1 rounded-md text-xs">{customer.id}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-200">
                          {customer.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900">
                            {customer.name}
                          </span>
                          <span className="text-xs text-gray-500">{customer.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">
                          ₹{customer.totalPurchase.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                          Lifetime Value
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`font-semibold border-none ${
                          customer.source === 'LEAD'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {customer.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 font-medium text-sm whitespace-nowrap">
                      {new Date(customer.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => handleEditCustomer(customer)}
                          title="Edit Customer"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <a href={`tel:${customer.phone}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        </a>
                        <a href={`mailto:${customer.email}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer - Static for now - Matched with Container style */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing 1-{filteredCustomers.length} of {customers.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled
              className="h-8 text-xs border-blue-200 hover:bg-white hover:text-primary"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-blue-200 hover:bg-white hover:text-primary"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={selectedCustomer}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
