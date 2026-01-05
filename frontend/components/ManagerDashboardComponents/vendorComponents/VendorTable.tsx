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
import { Button } from '@/components/ui/button';
import { Search, Filter, Eye, Edit, Plus, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { createVendor, updateVendor, deleteVendor as apiDeleteVendor } from '@/lib/vendor';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Vendor = {
  id: string;
  name: string;
  type: 'Supplier' | 'Distributor' | 'Service';
  contactPerson: string;
  phone: string;
  email: string;
  totalOrders: number;
  purchaseValue: number;
  outstandingAmount: number;
  status: 'Active' | 'On Hold';
};

type VendorFormData = {
  name: string;
  type: 'Supplier' | 'Distributor' | 'Service';
  contactPerson: string;
  phone: string;
  email: string;
  status: 'Active' | 'On Hold';
};

export default function VendorTable({
  vendors,
  loading,
  onRefresh,
  basePath = '/manager',
}: {
  vendors: Vendor[];
  loading: boolean;
  onRefresh: () => void | Promise<void>;
  basePath?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');

  const [formOpen, setFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteVendorTarget, setDeleteVendorTarget] = useState<Vendor | null>(null);

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.name.toLowerCase().includes(search.toLowerCase()) ||
      vendor.contactPerson.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'All' || vendor.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleSave = async (data: VendorFormData) => {
    try {
      const apiData = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        status: (data.status === 'Active' ? 'ACTIVE' : 'INACTIVE') as 'ACTIVE' | 'INACTIVE',
      };

      if (editingVendor) {
        await updateVendor(editingVendor.id, apiData);
        toast.success('Vendor updated successfully');
      } else {
        await createVendor(apiData);
        toast.success('Vendor created successfully');
      }

      onRefresh();
      setFormOpen(false);
      setEditingVendor(null);
    } catch (err: unknown) {
      console.error('Failed to save vendor', err);
      if (err instanceof AxiosError) {
        toast.error(err.response?.data?.message || 'Failed to save vendor');
      } else {
        toast.error('Failed to save vendor');
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteVendorTarget) return;
    try {
      await apiDeleteVendor(deleteVendorTarget.id);
      toast.success('Vendor deleted successfully');
      onRefresh();
      setDeleteVendorTarget(null);
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data?.message || 'Failed to delete vendor');
      } else {
        toast.error('Failed to delete vendor');
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-blue-900 font-medium">Loading vendors...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center px-4 pt-4">
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-white border-blue-400/60 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm transition-all"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-white border-blue-400/60">
                <Filter className="h-4 w-4" />
                Filter: {filterType}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilterType('All')}>All Types</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('Supplier')}>
                Supplier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('Distributor')}>
                Distributor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('Service')}>Service</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="bg-primary text-white gap-2"
            onClick={() => {
              setEditingVendor(null);
              setFormOpen(true);
            }}
          >
            <Plus size={16} /> Add Vendor
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white overflow-hidden shadow-sm m-4 mt-0">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
          <Table className="min-w-[1050px]">
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-blue-50/50 hover:bg-transparent">
                <TableHead className="font-bold text-[10px] text-blue-900 uppercase py-3 px-4">
                  Vendor Name
                </TableHead>
                <TableHead className="font-bold text-[10px] text-blue-900 uppercase">
                  Code
                </TableHead>
                <TableHead className="font-bold text-[10px] text-blue-900 uppercase">
                  Type
                </TableHead>
                <TableHead className="font-bold text-[10px] text-blue-900 uppercase">
                  Contact
                </TableHead>
                <TableHead className="font-bold text-[10px] text-blue-900 uppercase">
                  Details
                </TableHead>
                <TableHead className="text-right font-bold text-[10px] text-blue-900 uppercase">
                  Orders
                </TableHead>
                <TableHead className="text-right font-bold text-[10px] text-blue-900 uppercase">
                  Purchase Value
                </TableHead>
                <TableHead className="text-right font-bold text-[10px] text-blue-900 uppercase">
                  Outstanding
                </TableHead>
                <TableHead className="font-bold text-[10px] text-blue-900 uppercase">
                  Status
                </TableHead>
                <TableHead className="text-right font-bold text-[10px] text-blue-900 uppercase px-4">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.length > 0 ? (
                filteredVendors.map((vendor, index) => (
                  <TableRow
                    key={vendor.id}
                    className={`border-b border-blue-50/20 hover:bg-blue-50/30 transition-colors ${
                      index % 2 !== 0 ? 'bg-sky-50/20' : ''
                    }`}
                  >
                    <TableCell className="px-4 py-3 font-semibold text-blue-900">
                      {vendor.name}
                    </TableCell>
                    <TableCell className="text-slate-500 font-medium text-[10px]">
                      VND-{vendor.id.substring(0, 4)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          vendor.type === 'Supplier'
                            ? 'bg-blue-100 text-blue-700'
                            : vendor.type === 'Distributor'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {vendor.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-semibold text-gray-800">
                        {vendor.contactPerson}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-[10px] text-slate-500">
                        <span className="font-medium">{vendor.phone}</span>
                        <span className="font-medium">{vendor.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs font-bold text-gray-700">
                      {vendor.totalOrders}
                    </TableCell>
                    <TableCell className="text-right font-bold text-blue-900 text-xs">
                      ₹ {vendor.purchaseValue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-600 text-xs">
                      ₹ {vendor.outstandingAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                          vendor.status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        <span
                          className={`h-1 w-1 rounded-full ${
                            vendor.status === 'Active' ? 'bg-green-600' : 'bg-yellow-600'
                          }`}
                        />
                        {vendor.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right px-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => router.push(`${basePath}/vendors/${vendor.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                          onClick={() => {
                            setEditingVendor(vendor);
                            setFormOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteVendorTarget(vendor)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-slate-500 italic">
                    No vendors found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* MODALS */}
      <VendorFormModal
        initialData={editingVendor}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onConfirm={handleSave}
      />

      <ConfirmDeleteModal
        open={!!deleteVendorTarget}
        name={deleteVendorTarget?.name || ''}
        onCancel={() => setDeleteVendorTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function VendorFormModal({
  initialData,
  open,
  onClose,
  onConfirm,
}: {
  initialData: Vendor | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (data: VendorFormData) => void;
}) {
  const [form, setForm] = useState<VendorFormData>(
    initialData
      ? {
          name: initialData.name,
          type: initialData.type,
          contactPerson: initialData.contactPerson,
          phone: initialData.phone,
          email: initialData.email,
          status: initialData.status,
        }
      : {
          name: '',
          type: 'Supplier',
          contactPerson: '',
          phone: '',
          email: '',
          status: 'Active',
        },
  );

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-blue-900">
            {initialData ? 'Update Vendor' : 'Add Vendor'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Vendor Name
              </label>
              <Input
                placeholder="Enter vendor name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Contact Person
              </label>
              <Input
                placeholder="Enter contact person"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Type
              </label>
              <Select
                value={form.type}
                onValueChange={(value) =>
                  setForm({ ...form, type: value as VendorFormData['type'] })
                }
              >
                <SelectTrigger className="h-12 rounded-xl bg-white border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Supplier">Supplier</SelectItem>
                  <SelectItem value="Distributor">Distributor</SelectItem>
                  <SelectItem value="Service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Phone
              </label>
              <Input
                placeholder="Enter phone number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Email
              </label>
              <Input
                placeholder="Enter email address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Status
              </label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm({ ...form, status: value as VendorFormData['status'] })
                }
              >
                <SelectTrigger className="h-12 rounded-xl bg-white border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
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

function ConfirmDeleteModal({
  open,
  name,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-4 text-red-600 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shadow-sm">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-blue-900">Delete Vendor</DialogTitle>
          </div>
          <DialogDescription className="text-base text-gray-600 leading-relaxed">
            Are you sure you want to delete <strong>{name}</strong>?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end items-center gap-6 pt-8">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-bold text-gray-900 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
          <Button
            className="h-12 px-8 rounded-xl bg-red-600 text-white hover:bg-red-700 font-bold shadow-lg"
            onClick={onConfirm}
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
