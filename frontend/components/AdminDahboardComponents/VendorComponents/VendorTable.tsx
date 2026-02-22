'use client';

import React, { useState, useCallback } from 'react';
import { StandardTable } from '@/components/table/StandardTable';
import { DeleteConfirmDialog } from '@/components/dialogs/DeleteConfirmDialog';
import { usePagination } from '@/hooks/usePagination';
import VendorStats from './VendorStats';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import {
  createVendor,
  updateVendor,
  deleteVendor as apiDeleteVendor,
  getVendors,
  getVendorStats,
  requestProducts,
} from '@/lib/vendor';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send } from 'lucide-react';
import RequestProductDialog from '@/components/ManagerDashboardComponents/VendorComponents/RequestProductDialog';

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

/**
 * Comprehensive table for managing vendors.
 * Features search, filtering by type, adding/editing vendors, and requesting products.
 * Displays key metrics like total orders and outstanding amounts for each vendor.
 */
export default function VendorTable({ basePath = '/admin' }: { basePath?: string }) {
  const router = useRouter();
  const [search] = useState('');
  const [filterType] = useState<'All' | 'Supplier' | 'Distributor' | 'Service'>('All');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  const { page, limit, total, setPage, setLimit, setTotal } = usePagination(10);
  const [stats, setStats] = useState({ total: 0, active: 0, totalSpending: 0, totalOrders: 0 });

  const [formOpen, setFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteVendor, setDeleteVendorTarget] = useState<Vendor | null>(null);
  const [requestVendor, setRequestVendor] = useState<Vendor | null>(null);

  const fetchVendorsData = useCallback(async () => {
    setLoading(true);
    try {
      const typeFilter = filterType !== 'All' ? filterType : undefined;
      const res = await getVendors({ page, limit, search, type: typeFilter });
      const rawVendors = res.data || [];

      const mappedVendors: Vendor[] = rawVendors.map((v: Record<string, unknown>) => ({
        id: v.id as string,
        name: v.name as string,
        type: (v.type as 'Supplier' | 'Distributor' | 'Service') || 'Supplier',
        contactPerson: (v.contactPerson as string) || 'N/A',
        phone: (v.phone as string) || 'N/A',
        email: (v.email as string) || 'N/A',
        totalOrders: (v.totalOrders as number) || 0,
        purchaseValue: (v.purchaseValue as number) || 0,
        outstandingAmount: (v.outstandingAmount as number) || 0,
        status: v.status === 'ACTIVE' ? 'Active' : 'On Hold',
      }));

      setVendors(mappedVendors);
      setTotal(res.total || res.data.length);

      // Fetch global stats if viewing all branches or admin view
      try {
        const globalStats = await getVendorStats();
        setStats({
          total: globalStats.total,
          active: globalStats.active,
          totalSpending: globalStats.totalSpending,
          totalOrders: globalStats.totalOrders,
        });
      } catch (statsErr) {
        console.error('Failed to fetch global vendor stats:', statsErr);
        // Fallback to naive stats if backend fails
        setStats({
          total: res.total || res.data.length,
          active: rawVendors.filter((v: Record<string, unknown>) => v.status === 'ACTIVE').length,
          totalSpending: rawVendors.reduce(
            (sum: number, v: Record<string, unknown>) => sum + (Number(v.purchaseValue) || 0),
            0,
          ),
          totalOrders: rawVendors.reduce(
            (sum: number, v: Record<string, unknown>) => sum + (Number(v.totalOrders) || 0),
            0,
          ),
        });
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      toast.error('Failed to load vendor data');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filterType, setTotal]);

  React.useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchVendorsData();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchVendorsData]);

  const onRefresh = fetchVendorsData;

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

  const handleRequestProducts = async (data: { products: string; message: string }) => {
    if (!requestVendor) return;
    try {
      await requestProducts(requestVendor.id, data);
      toast.success(`Request sent to ${requestVendor.name}`);
      setRequestVendor(null);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to send request');
    }
  };

  return (
    <div className="space-y-4">
      <VendorStats
        totalVendors={stats.total}
        activeVendors={stats.active}
        totalSpending={stats.totalSpending}
        totalOrders={stats.totalOrders}
      />

      <StandardTable
        columns={[
          {
            id: 'name',
            header: 'VENDOR NAME',
            accessorKey: 'name' as keyof Vendor,
            className: 'font-semibold text-[11px] text-primary uppercase',
          },
          {
            id: 'code',
            header: 'CODE',
            cell: (v: Vendor) => `VND-${v.id.substring(0, 4)}`,
            className: 'font-semibold text-[11px] text-primary uppercase',
          },
          {
            id: 'type',
            header: 'TYPE',
            className: 'font-semibold text-[11px] text-primary uppercase',
            cell: (v: Vendor) => (
              <span
                className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  v.type === 'Supplier'
                    ? 'bg-blue-100 text-blue-700'
                    : v.type === 'Distributor'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-orange-100 text-orange-700'
                }`}
              >
                {v.type}
              </span>
            ),
          },
          {
            id: 'contact',
            header: 'CONTACT',
            accessorKey: 'contactPerson' as keyof Vendor,
            className: 'font-semibold text-[11px] text-primary uppercase',
          },
          {
            id: 'details',
            header: 'DETAILS',
            className: 'font-semibold text-[11px] text-primary uppercase',
            cell: (v: Vendor) => (
              <div className="flex flex-col text-[11px] text-muted-foreground w-max leading-tight gap-1">
                <span className="font-medium text-slate-800">{v.phone}</span>
                <span>{v.email}</span>
              </div>
            ),
          },
          {
            id: 'orders',
            header: 'ORDERS',
            cell: (v: Vendor) => v.totalOrders,
            className: 'text-right font-semibold text-[11px] text-primary uppercase w-[80px]',
          },
          {
            id: 'purchase',
            header: 'PURCHASE VALUE',
            className: 'text-right font-semibold text-[11px] text-primary uppercase w-[120px]',
            cell: (v: Vendor) => (
              <span className="font-bold text-primary">QAR {v.purchaseValue.toLocaleString()}</span>
            ),
          },
          {
            id: 'outstanding',
            header: 'OUTSTANDING',
            className: 'text-right font-semibold text-[11px] text-primary uppercase w-[120px]',
            cell: (v: Vendor) => (
              <span className="font-bold text-red-600">
                QAR {v.outstandingAmount.toLocaleString()}
              </span>
            ),
          },
          {
            id: 'status',
            header: 'STATUS',
            className: 'font-semibold text-[11px] text-primary uppercase w-[100px]',
            cell: (v: Vendor) => (
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                  v.status === 'Active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${v.status === 'Active' ? 'bg-green-600' : 'bg-yellow-600'}`}
                />
                {v.status}
              </span>
            ),
          },
          {
            id: 'actions',
            header: 'ACTIONS',
            className: 'text-right font-semibold text-[11px] text-primary uppercase',
            cell: (v: Vendor) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => router.push(`${basePath}/vendors/${v.id}`)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    setEditingVendor(v);
                    setFormOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
                  title="Request Products"
                  onClick={() => setRequestVendor(v)}
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setDeleteVendorTarget(v)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]}
        data={vendors}
        loading={loading}
        emptyMessage="No vendors found matching your criteria."
        keyExtractor={(v) => v.id}
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {/* MODALS */}
      <VendorFormModal
        initialData={editingVendor}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onConfirm={handleSave}
      />

      <DeleteConfirmDialog
        open={!!deleteVendor}
        onOpenChange={(open) => !open && setDeleteVendorTarget(null)}
        title="Delete Vendor?"
        itemName={deleteVendor?.name}
        onConfirm={confirmDelete}
      />

      {requestVendor && (
        <RequestProductDialog
          open={!!requestVendor}
          onOpenChange={(open) => !open && setRequestVendor(null)}
          vendor={requestVendor}
          onConfirm={handleRequestProducts}
        />
      )}
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
