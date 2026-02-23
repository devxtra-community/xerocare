'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
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
import Pagination from '@/components/Pagination';
import {
  Customer,
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  CreateCustomerData,
} from '@/lib/customer';
import CustomerFormDialog from './CustomerFormDialog';
import { toast } from 'sonner';

/**
 * Table displaying all customers managed by the employee.
 * Features search, filtering, and actions to add/edit/delete customers.
 */
export default function EmployeeCustomerTable() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setDialogOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      await deleteCustomer(id);
      toast.success('Customer deleted successfully');
      fetchCustomers();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete customer');
    }
  };

  const handleFormSubmit = async (data: Partial<CreateCustomerData>) => {
    try {
      const payload: CreateCustomerData = {
        name: data.name!,
        email: data.email,
        phone: data.phone,
        status: data.status,
        totalPurchase: 0,
        source: 'DIRECT',
      };

      if (selectedCustomer) {
        await updateCustomer(selectedCustomer.id, {
          ...payload,
          status: data.status, // Ensure status is passed
        });
        toast.success('Customer updated successfully');
      } else {
        await createCustomer(payload);
        toast.success('Customer created successfully');
      }
      fetchCustomers();
    } catch (error) {
      console.error(error);
      toast.error(selectedCustomer ? 'Failed to update customer' : 'Failed to create customer');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-primary">Customer Management</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
            {customers.length} Total
          </span>
        </div>
        <Button
          onClick={handleAddCustomer}
          className="h-10 rounded-lg bg-primary hover:bg-primary/90 text-white shadow-md gap-2"
        >
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </div>

      <div className="bg-card rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Search Customers
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Actions
            </label>
            <Button
              variant="outline"
              onClick={fetchCustomers}
              className="h-9 text-xs w-full justify-center gap-2 border-gray-200 hover:bg-gray-50"
            >
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border p-4">
        <div className="overflow-x-auto mb-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-primary font-bold whitespace-nowrap">Name</TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">Email</TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">Phone</TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">Status</TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap">
                  Created At
                </TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap text-right pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paginatedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No customers found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((customer, index) => (
                  <TableRow key={customer.id} className={index % 2 ? 'bg-blue-50/20' : 'bg-card'}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-200">
                          {customer.name.charAt(0)}
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          {customer.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {customer.email || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {customer.phone || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`font-semibold border-none ${
                          customer.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {customer.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-medium text-sm whitespace-nowrap">
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
                          className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => handleEditCustomer(customer)}
                          title="Edit Customer"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteCustomer(customer.id)}
                          title="Delete Customer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        )}
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
