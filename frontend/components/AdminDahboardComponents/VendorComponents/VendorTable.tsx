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

// Extend frontend Vendor type to match API + UI needs
// We keep the UI structure but populate from API where possible
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

export { type Vendor }; // Export so parent can use it

export default function VendorTable({
  vendors,
  loading,
  onRefresh,
  basePath = '/admin',
}: {
  vendors: Vendor[];
  loading: boolean;
  onRefresh: () => void | Promise<void>;
  basePath?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Supplier' | 'Distributor' | 'Service'>(
    'All',
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteVendor, setDeleteVendorTarget] = useState<Vendor | null>(null);

  /* Fetched in parent */

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.name.toLowerCase().includes(search.toLowerCase()) ||
      vendor.contactPerson.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'All' || vendor.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleSave = async (data: VendorFormData) => {
    try {
      // Helper to map UI status back to API status
      const apiData = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        type: data.type,
        contactPerson: data.contactPerson,
        status: (data.status === 'Active' ? 'ACTIVE' : 'INACTIVE') as 'ACTIVE' | 'INACTIVE',
      };

      if (editingVendor) {
        await updateVendor(editingVendor.id, apiData);
      } else {
        await createVendor(apiData);
      }

      onRefresh(); // Refresh list
      setFormOpen(false);
      setEditingVendor(null);
    } catch (err: unknown) {
      console.error('Failed to save vendor', err);
      if (err instanceof AxiosError) {
        toast.error(err.response?.data?.message || 'Failed to save vendor');
      } else if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Failed to save vendor');
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteVendor) return;
    try {
      await apiDeleteVendor(deleteVendor.id);
      onRefresh(); // Refresh list
      setDeleteVendorTarget(null);
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data?.message || 'Failed to delete vendor');
      } else if (err instanceof Error) {
        toast.error(err.message || 'Failed to delete vendor');
      } else {
        toast.error('Failed to delete vendor');
      }
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading vendors...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-card border-blue-400/60 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm transition-all"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-card">
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

      <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-card border-b border-border">
            <TableRow>
              <TableHead className="font-semibold text-[11px] text-primary uppercase">
                Vendor Name
              </TableHead>
              <TableHead className="font-semibold text-[11px] text-primary uppercase">
                Code
              </TableHead>
              <TableHead className="font-semibold text-[11px] text-primary uppercase">
                Type
              </TableHead>
              <TableHead className="font-semibold text-[11px] text-primary uppercase">
                Contact
              </TableHead>
              <TableHead className="font-semibold text-[11px] text-primary uppercase">
                Details
              </TableHead>
              <TableHead className="text-right font-semibold text-[11px] text-primary uppercase">
                Orders
              </TableHead>
              <TableHead className="text-right font-semibold text-[11px] text-primary uppercase">
                Purchase Value
              </TableHead>
              <TableHead className="text-right font-semibold text-[11px] text-primary uppercase">
                Outstanding
              </TableHead>
              <TableHead className="font-semibold text-[11px] text-primary uppercase">
                Status
              </TableHead>
              <TableHead className="text-right font-semibold text-[11px] text-primary uppercase">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors.length > 0 ? (
              filteredVendors.map((vendor, index) => (
                <TableRow
                  key={vendor.id}
                  className={`border-b border-gray-100 hover:bg-muted/50/50 ${index % 2 !== 0 ? 'bg-blue-50/20' : 'bg-card'}`}
                >
                  <TableCell className="font-medium text-primary">{vendor.name}</TableCell>
                  <TableCell className="text-muted-foreground font-medium">
                    VND-{vendor.id.substring(0, 4)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{vendor.contactPerson}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs text-muted-foreground">
                      <span>{vendor.phone}</span>
                      <span>{vendor.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{vendor.totalOrders}</TableCell>
                  <TableCell className="text-right font-medium">
                    ₹ {vendor.purchaseValue.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-medium text-red-600">
                    ₹ {vendor.outstandingAmount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        vendor.status === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${vendor.status === 'Active' ? 'bg-green-600' : 'bg-yellow-600'}`}
                      ></span>
                      {vendor.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
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
                        className="h-8 w-8 text-muted-foreground hover:text-slate-700 hover:bg-slate-100"
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
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No vendors found matching your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* MODALS */}
      <VendorFormModal
        initialData={editingVendor}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onConfirm={handleSave}
      />

      <ConfirmDeleteModal
        open={!!deleteVendor}
        name={deleteVendor?.name || ''}
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
  const [form, setForm] = useState<VendorFormData>({
    name: '',
    type: 'Supplier',
    contactPerson: '',
    phone: '',
    email: '',
    status: 'Active',
  });

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          name: initialData.name,
          type: initialData.type,
          contactPerson: initialData.contactPerson,
          phone: initialData.phone,
          email: initialData.email,
          status: initialData.status,
        });
      } else {
        setForm({
          name: '',
          type: 'Supplier',
          contactPerson: '',
          phone: '',
          email: '',
          status: 'Active',
        });
      }
    }
  }, [initialData, open]);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary">
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
                className="h-12 rounded-xl bg-card border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
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
                className="h-12 rounded-xl bg-card border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
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
                <SelectTrigger className="h-12 rounded-xl bg-card border-none shadow-sm focus:ring-2 focus:ring-blue-400">
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
                className="h-12 rounded-xl bg-card border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
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
                className="h-12 rounded-xl bg-card border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
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
                <SelectTrigger className="h-12 rounded-xl bg-card border-none shadow-sm focus:ring-2 focus:ring-blue-400">
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
              className="text-sm font-bold text-foreground hover:text-gray-600 transition-colors"
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
            <DialogTitle className="text-xl font-bold text-primary">Delete Vendor</DialogTitle>
          </div>
          <DialogDescription className="text-base text-gray-600 leading-relaxed">
            Are you sure you want to delete <strong>{name}</strong>?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end items-center gap-6 pt-8">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-bold text-foreground hover:text-gray-600 transition-colors"
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
