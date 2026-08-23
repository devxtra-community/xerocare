'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Edit, Trash2, Eye, LayoutList } from 'lucide-react';
import { getUserFromToken } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import {
  Customer,
  CustomerType,
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  CreateCustomerData,
} from '@/lib/customer';
import CustomerFormDialog from './CustomerFormDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';

const safeFormatDate = (
  dateVal: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locales: string | string[] = 'en-GB',
) => {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      return 'N/A';
    }
    return d.toLocaleDateString(locales, options);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'N/A';
  }
};

/**
 * Table displaying all customers managed by the employee.
 * Features search, filtering, and actions to add/edit/delete customers.
 */
export default function EmployeeCustomerTable() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | CustomerType>('ALL');
  const isManager = typeof window !== 'undefined' && getUserFromToken()?.role === 'MANAGER';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || (c.customerType ?? 'B2C') === typeFilter;
    return matchesSearch && matchesType;
  });

  const { page, limit, total, setPage, setTotal, totalPages } = usePagination(10);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, typeFilter, setPage]);

  useEffect(() => {
    setTotal(filteredCustomers.length);
  }, [filteredCustomers.length, setTotal]);

  const paginatedCustomers = filteredCustomers.slice((page - 1) * limit, page * limit);

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setDialogOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  // Delete States
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setDeletingCustomerId(id);
    setDeleteOpen(true);
  };

  const executeDeleteCustomer = async () => {
    if (!deletingCustomerId) return;
    try {
      await deleteCustomer(deletingCustomerId);
      toast.success('Customer deleted successfully');
      fetchCustomers();
    } catch (error) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to delete customer');
    } finally {
      setDeleteOpen(false);
    }
  };

  const handleFormSubmit = async (data: Partial<CreateCustomerData>) => {
    try {
      // Previously dropped customerType, vatStatus and exemptionReason entirely —
      // the Add/Edit dialog's "Customer Type" selector correctly tracked B2B/B2C in
      // its own state, but this payload never forwarded it, so every save silently
      // fell back to the customerType column's DB default (B2C) regardless of what
      // was picked. Also sent status/totalPurchase/source, none of which are real
      // columns on Customer (only isActive is) — harmless for create, but fatal for
      // update: TypeORM's repo.update() builds its SET clause from the given
      // object's own keys and throws on one with no matching column, which is what
      // produced "Internal server error" on every Update.
      const payload: CreateCustomerData = {
        name: data.name!,
        email: data.email,
        phone: data.phone,
        address: data.address,
        vatNumber: data.vatNumber,
        vatStatus: data.vatStatus,
        exemptionReason: data.exemptionReason,
        customerType: data.customerType,
        country: data.country,
        stateProvince: data.stateProvince,
        city: data.city,
        bankName: data.bankName,
        bankAccountNumber: data.bankAccountNumber,
        bankAccounts: data.bankAccounts,
      };
      const isActive = data.status !== 'INACTIVE';

      if (selectedCustomer) {
        await updateCustomer(selectedCustomer.id, { ...payload, isActive });
        toast.success('Customer updated successfully');
      } else {
        await createCustomer({ ...payload, isActive });
        toast.success('Customer created successfully');
      }
      fetchCustomers();
    } catch (error) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err.response?.data?.message ||
          (selectedCustomer ? 'Failed to update customer' : 'Failed to create customer'),
      );
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
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
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
              Type
            </label>
            <Select
              value={typeFilter}
              onValueChange={(val) => setTypeFilter(val as 'ALL' | CustomerType)}
            >
              <SelectTrigger className="h-9 text-xs w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="B2B">B2B</SelectItem>
                <SelectItem value="B2C">B2C</SelectItem>
              </SelectContent>
            </Select>
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
                <TableHead className="text-primary font-bold whitespace-nowrap">Type</TableHead>
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
                  <TableCell colSpan={7} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paginatedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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
                          (customer.customerType ?? 'B2C') === 'B2B'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {customer.customerType ?? 'B2C'}
                      </Badge>
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
                      {safeFormatDate(
                        customer.createdAt,
                        {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        },
                        'en-GB',
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => router.push(`/employee/customers/${customer.id}`)}
                          title="View Customer"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50"
                          onClick={() =>
                            router.push(
                              isManager
                                ? `/manager/customers/${customer.id}`
                                : `/employee/customers/${customer.id}/360`,
                            )
                          }
                          title={
                            isManager
                              ? '360° Profile (branch-wide)'
                              : '360° Profile (your transactions)'
                          }
                        >
                          <LayoutList className="h-4 w-4" />
                        </Button>
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
                          onClick={() => handleDeleteClick(customer.id)}
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
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
          />
        )}
      </div>

      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={selectedCustomer}
        onSubmit={handleFormSubmit}
      />

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Customer"
        description="Are you sure you want to delete this customer? This action cannot be undone."
        type="destructive"
        confirmText="Delete Customer"
        onConfirm={executeDeleteCustomer}
      />
    </div>
  );
}
