'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { Warehouse } from '@/lib/warehouse';
import { Branch } from '@/lib/branch';
import { getAllEmployees, Employee } from '@/lib/employee';
import { countryNameFromIso } from '@/lib/countryOptions';

const LABEL = 'text-[10px] font-bold text-gray-400 uppercase tracking-wider';
const CONTROL =
  'h-12 rounded-xl bg-muted/50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400';

export interface WarehouseFormValues extends Partial<Warehouse> {
  contactPersonName?: string;
  contactPersonEmail?: string;
}

interface WarehouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: Warehouse | null;
  branches: Branch[];
  /** When set, the branch is fixed (manager view) and shown read-only. */
  lockedBranchId?: string;
  onSubmit: (data: WarehouseFormValues) => Promise<void> | void;
}

const emptyForm = (branchId: string): WarehouseFormValues => ({
  warehouseName: '',
  warehouseCode: '',
  branchId,
  country: '',
  contactPersonId: '',
  contactPersonName: '',
  contactPersonEmail: '',
  location: '',
  address: '',
  capacity: '',
  status: 'ACTIVE',
});

const employeeLabel = (e: Employee) =>
  `${[e.first_name, e.last_name].filter(Boolean).join(' ') || e.email}${
    e.role ? ` · ${e.role}` : ''
  }`;

/**
 * Shared Add / Update Warehouse dialog. Country auto-fills from the selected
 * branch's country; the contact person is picked from that branch's staff
 * (branch manager included).
 */
export default function WarehouseFormDialog({
  open,
  onOpenChange,
  initialData,
  branches,
  lockedBranchId,
  onSubmit,
}: WarehouseFormDialogProps) {
  const [form, setForm] = useState<WarehouseFormValues>(
    emptyForm(lockedBranchId || branches[0]?.id || ''),
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const branchById = useCallback(
    (id?: string) => branches.find((b) => b.id === id || b.branch_id === id),
    [branches],
  );

  // Seed the form whenever the dialog opens or the target row changes.
  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setForm({
        ...initialData,
        country:
          initialData.country || countryNameFromIso(branchById(initialData.branchId)?.country_code),
      });
    } else {
      const branchId = lockedBranchId || branches[0]?.id || '';
      setForm({
        ...emptyForm(branchId),
        country: countryNameFromIso(branchById(branchId)?.country_code),
      });
    }
  }, [open, initialData, lockedBranchId, branches, branchById]);

  // Load the chosen branch's staff for the contact-person picker.
  useEffect(() => {
    if (!open || !form.branchId) {
      setEmployees([]);
      return;
    }
    let cancelled = false;
    setLoadingEmployees(true);
    getAllEmployees(1, 200, undefined, undefined, form.branchId)
      .then((res) => {
        if (!cancelled) setEmployees(res.data?.employees || []);
      })
      .catch(() => {
        if (!cancelled) setEmployees([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEmployees(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, form.branchId]);

  const contactOptions = useMemo(() => {
    const opts = employees.map((e) => ({
      value: e.id,
      label: employeeLabel(e),
      description: e.email,
    }));
    // Keep an already-assigned person visible even if they're not in the list
    // (e.g. list still loading, or they changed branch).
    if (form.contactPersonId && !opts.some((o) => o.value === form.contactPersonId)) {
      opts.unshift({
        value: form.contactPersonId,
        label: form.contactPersonName || 'Assigned contact',
        description: form.contactPersonEmail || '',
      });
    }
    return [{ value: '__none__', label: 'None', description: 'No contact person' }, ...opts];
  }, [employees, form.contactPersonId, form.contactPersonName, form.contactPersonEmail]);

  const handleBranchChange = (branchId: string) => {
    setForm((prev) => ({
      ...prev,
      branchId,
      country: countryNameFromIso(branchById(branchId)?.country_code),
      // Contact person belongs to a branch — drop it when the branch changes.
      contactPersonId: '',
      contactPersonName: '',
      contactPersonEmail: '',
    }));
  };

  const handleContactChange = (value: string) => {
    if (value === '__none__') {
      setForm((prev) => ({
        ...prev,
        contactPersonId: '',
        contactPersonName: '',
        contactPersonEmail: '',
      }));
      return;
    }
    const emp = employees.find((e) => e.id === value);
    setForm((prev) => ({
      ...prev,
      contactPersonId: value,
      contactPersonName: emp ? employeeLabel(emp).split(' · ')[0] : prev.contactPersonName,
      contactPersonEmail: emp?.email || prev.contactPersonEmail,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.warehouseName?.trim()) return toast.error('Warehouse name is required');
    if (!form.warehouseCode?.trim()) return toast.error('Warehouse code is required');
    if (!form.branchId) return toast.error('Branch is required');

    setSubmitting(true);
    try {
      // Send only editable columns — never the joined `branch` / timestamps that
      // ride along on an edit row, which TypeORM's .update() rejects. `null`
      // (not undefined) so clearing a field on an edit actually persists.
      await onSubmit({
        warehouseName: form.warehouseName?.trim(),
        warehouseCode: form.warehouseCode?.trim(),
        branchId: form.branchId,
        country: form.country?.trim() || null,
        contactPersonId: form.contactPersonId || null,
        contactPersonName: form.contactPersonId ? form.contactPersonName || null : null,
        contactPersonEmail: form.contactPersonId ? form.contactPersonEmail || null : null,
        location: form.location?.trim() || null,
        address: form.address?.trim() || null,
        capacity: form.capacity?.trim() || null,
        status: form.status,
      } as WarehouseFormValues);
    } finally {
      setSubmitting(false);
    }
  };

  const branchName = branchById(form.branchId)?.name || 'N/A';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary text-center">
            {initialData ? 'Update Warehouse' : 'Add Warehouse'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <div className="col-span-2 space-y-2">
              <label className={LABEL}>Warehouse Name *</label>
              <Input
                placeholder="Enter warehouse name"
                value={form.warehouseName || ''}
                onChange={(e) => setForm({ ...form, warehouseName: e.target.value })}
                className={CONTROL}
              />
            </div>

            <div className="space-y-2">
              <label className={LABEL}>Warehouse Code *</label>
              <Input
                placeholder="e.g., WH-001"
                value={form.warehouseCode || ''}
                onChange={(e) => setForm({ ...form, warehouseCode: e.target.value })}
                className={CONTROL}
              />
            </div>

            <div className="space-y-2">
              <label className={LABEL}>Branch</label>
              {lockedBranchId ? (
                <div className="h-12 rounded-xl bg-gray-100 shadow-sm flex items-center px-4 text-sm font-medium text-gray-700">
                  {branchName}
                </div>
              ) : (
                <SearchableSelect
                  value={form.branchId || ''}
                  onValueChange={handleBranchChange}
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  placeholder="Select branch"
                  emptyText="No branches found"
                  className={CONTROL}
                />
              )}
            </div>

            <div className="space-y-2">
              <label className={LABEL}>Country</label>
              <Input
                placeholder="Auto-filled from branch"
                value={form.country || ''}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className={CONTROL}
              />
            </div>

            <div className="space-y-2">
              <label className={LABEL}>Location / City</label>
              <Input
                placeholder="Enter city"
                value={form.location || ''}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className={CONTROL}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <label className={LABEL}>Contact Person</label>
              <SearchableSelect
                value={form.contactPersonId || '__none__'}
                onValueChange={handleContactChange}
                options={contactOptions}
                loading={loadingEmployees}
                placeholder="Select a staff member from this branch"
                emptyText="No staff found for this branch"
                className={CONTROL}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <label className={LABEL}>Full Address</label>
              <Input
                placeholder="Enter complete address"
                value={form.address || ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={CONTROL}
              />
            </div>

            <div className="space-y-2">
              <label className={LABEL}>Capacity</label>
              <Input
                placeholder="e.g., 30000 sqft"
                value={form.capacity || ''}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className={CONTROL}
              />
            </div>

            <div className="space-y-2">
              <label className={LABEL}>Status</label>
              <Select
                value={form.status || 'ACTIVE'}
                onValueChange={(value) =>
                  setForm({ ...form, status: value as 'ACTIVE' | 'INACTIVE' })
                }
              >
                <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end items-center gap-6 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-sm font-bold text-foreground hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" disabled={submitting} className="h-12 px-10">
              {submitting ? 'Saving...' : initialData ? 'Update' : 'Confirm'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
