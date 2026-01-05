'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, X, Trash2 } from 'lucide-react';
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
import StatCard from '@/components/StatCard';
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch as apiDeleteBranch,
  Branch,
} from '@/lib/branch';
import { getManagersByRole, Employee } from '@/lib/employee';
import { toast } from 'sonner';

type BranchFormData = {
  id?: string;
  name: string;
  address: string;
  location: string;
  started_date: string;
  status: 'ACTIVE' | 'INACTIVE';
  manager_id: string;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export default function BranchReport() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [branchesRes, managersRes] = await Promise.all([getBranches(), getManagersByRole()]);

      if (branchesRes.success) {
        setBranches(branchesRes.data);
      }

      if (managersRes.success) {
        setManagers(managersRes.data.employees || []);
      }
    } catch {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const getManagerName = (managerId: string) => {
    const manager = managers.find((m) => m.id === managerId);
    return manager ? `${manager.first_name} ${manager.last_name}` : 'Unassigned';
  };

  const filtered = branches.filter((b) =>
    `${b.name} ${b.address} ${b.location}`.toLowerCase().includes(search.toLowerCase()),
  );

  const totalBranches = branches.length;
  const activeBranches = branches.filter((b) => b.status === 'ACTIVE').length;
  const inactiveBranches = branches.filter((b) => b.status === 'INACTIVE').length;

  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const newBranches = branches.filter((b) => new Date(b.started_date) >= twoYearsAgo).length;

  const handleSave = async (data: BranchFormData) => {
    try {
      if (editingBranch) {
        const res = await updateBranch(editingBranch.id, {
          name: data.name,
          address: data.address,
          location: data.location,
          manager_id: data.manager_id,
          started_date: data.started_date,
          status: data.status,
        });

        if (res.success) {
          toast.success('Branch updated successfully');
          await fetchData();
        }
      } else {
        const res = await createBranch({
          name: data.name,
          address: data.address,
          location: data.location,
          manager_id: data.manager_id,
          started_date: data.started_date,
        });

        if (res.success) {
          toast.success('Branch created successfully');
          await fetchData();
        }
      }
      setFormOpen(false);
      setEditingBranch(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || 'Failed to save branch');
    }
  };

  const confirmDelete = async () => {
    if (!branchToDelete) return;

    try {
      const res = await apiDeleteBranch(branchToDelete.id);

      if (res.success) {
        toast.success('Branch deleted successfully');
        await fetchData();
      }
      setBranchToDelete(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || 'Failed to delete branch');
    }
  };

  if (loading) {
    return (
      <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 flex items-center justify-center">
        <div className="text-blue-900 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8 sm:space-y-10">
      {/* BRANCHES */}
      <div className="space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-bold text-blue-900">Branches</h3>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
          <StatCard
            title="Total Branches"
            value={totalBranches.toString()}
            subtitle="All registered"
          />
          <StatCard
            title="Active Branches"
            value={activeBranches.toString()}
            subtitle="Currently operational"
          />
          <StatCard
            title="Inactive Branches"
            value={inactiveBranches.toString()}
            subtitle="Temporarily closed"
          />
          <StatCard title="New Branches" value={newBranches.toString()} subtitle="Last 2 years" />
        </div>

        {/* HEADER & SEARCH */}
        <div className="flex items-center justify-between pt-2">
          <div className="relative w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search branch"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button
            className="bg-primary text-white gap-2"
            onClick={() => {
              setEditingBranch(null);
              setFormOpen(true);
            }}
          >
            <Plus size={16} /> Add Branch
          </Button>
        </div>

        {/* TABLE */}
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {['BRANCH', 'ADDRESS', 'LOCATION', 'MANAGER', 'STARTED', 'STATUS', 'ACTION'].map(
                  (h) => (
                    <TableHead
                      key={h}
                      className="text-[11px] font-semibold text-blue-900 uppercase px-4"
                    >
                      {h}
                    </TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((b, i) => (
                <TableRow key={b.id} className={i % 2 ? 'bg-sky-100/60' : ''}>
                  <TableCell className="px-4 font-medium">{b.name}</TableCell>
                  <TableCell className="px-4">{b.address}</TableCell>
                  <TableCell className="px-4">{b.location}</TableCell>
                  <TableCell className="px-4">
                    <span
                      className={`${getManagerName(b.manager_id) === 'Unassigned' ? 'text-slate-400' : 'text-gray-900'}`}
                    >
                      {getManagerName(b.manager_id)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4">{formatDate(b.started_date)}</TableCell>
                  <TableCell className="px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        b.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {b.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex gap-3 text-sm">
                      <button
                        className="text-blue-900 hover:underline"
                        onClick={() => {
                          setEditingBranch(b);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => setBranchToDelete(b)}
                      >
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* MODALS */}
      {formOpen && (
        <BranchFormModal
          initialData={editingBranch}
          managers={managers}
          onClose={() => setFormOpen(false)}
          onConfirm={handleSave}
        />
      )}

      {branchToDelete && (
        <ConfirmDeleteModal
          name={branchToDelete.name}
          onCancel={() => setBranchToDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function BranchFormModal({
  initialData,
  managers,
  onClose,
  onConfirm,
}: {
  initialData: Branch | null;
  managers: Employee[];
  onClose: () => void;
  onConfirm: (data: BranchFormData) => void;
}) {
  const [form, setForm] = useState<BranchFormData>(
    initialData
      ? {
          id: initialData.id,
          name: initialData.name,
          address: initialData.address,
          location: initialData.location,
          started_date: initialData.started_date,
          status: initialData.status as 'ACTIVE' | 'INACTIVE',
          manager_id: initialData.manager_id,
        }
      : {
          name: '',
          address: '',
          location: '',
          started_date: '',
          status: 'ACTIVE',
          manager_id: '',
        },
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl px-6 py-5 relative">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {initialData ? 'Update Branch' : 'Add Branch'}
          </h2>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-full border text-gray-500 hover:text-gray-800"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Branch Name">
            <Input
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>

          <Field label="Branch Address">
            <Input
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>

          <Field label="Location">
            <Input
              placeholder="City / Area"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </Field>

          <Field label="Started Date">
            <Input
              type="date"
              value={form.started_date}
              onChange={(e) => setForm({ ...form, started_date: e.target.value })}
            />
          </Field>

          <Field label="Assign Manager">
            <Select
              value={form.manager_id}
              onValueChange={(value) => setForm({ ...form, manager_id: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                {managers.map((manager) => (
                  <SelectItem
                    key={manager.id}
                    value={manager.id}
                    className="focus:bg-primary focus:text-white"
                  >
                    {manager.first_name} {manager.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Branch Status">
            <Select
              value={form.status}
              onValueChange={(value) =>
                setForm({ ...form, status: value as 'ACTIVE' | 'INACTIVE' })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE" className="focus:bg-primary focus:text-white">
                  Active
                </SelectItem>
                <SelectItem value="INACTIVE" className="focus:bg-primary focus:text-white">
                  Inactive
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" className="rounded-full px-6" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="rounded-full px-6 bg-primary hover:bg-primary/90 text-white"
            onClick={() => onConfirm(form)}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  name,
  onCancel,
  onConfirm,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white max-w-sm w-full rounded-2xl p-6 text-center">
        <Trash2 className="mx-auto text-red-600 mb-3" />
        <h3 className="text-lg font-semibold">Delete Branch</h3>
        <p className="text-sm text-slate-500 mt-1">
          Are you sure you want to delete <b>{name}</b>?
        </p>

        <div className="flex justify-center gap-4 mt-6">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="bg-red-600 text-white" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
