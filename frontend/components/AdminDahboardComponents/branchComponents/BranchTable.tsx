'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Trash2,
  Building2,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import StatCard from '@/components/StatCard';
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch as apiDeleteBranch,
  Branch,
  CreateBranchPayload,
  UpdateBranchPayload,
} from '@/lib/branch';
import { getManagersByRole, Employee } from '@/lib/employee';
import { toast } from 'sonner';
import { getUserFromToken } from '@/lib/auth';
import Pagination from '@/components/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { countries } from 'countries-list';

// --------------- Country/Currency helpers ---------------

interface CountryOption {
  code: string; // ISO 3166-1 alpha-2, e.g. "AE"
  name: string; // e.g. "United Arab Emirates"
  currencyCode: string; // e.g. "AED"
  currencyName: string; // e.g. "UAE Dirham"
}

function buildCountryOptions(): CountryOption[] {
  const displayNames = new Intl.DisplayNames(['en'], { type: 'currency' });

  return Object.entries(countries)
    .flatMap(([code, info]) => {
      const rawCurrency = info.currency;
      const currencies = Array.isArray(rawCurrency)
        ? rawCurrency
        : String(rawCurrency ?? '').split(',');

      const currencyCode = (currencies[0] ?? '').trim();
      // Skip territories with no ISO 4217 currency code (e.g. Antarctica)
      if (currencyCode.length !== 3) return [];

      let currencyName = currencyCode;
      try {
        currencyName = displayNames.of(currencyCode) || currencyCode;
      } catch {
        currencyName = currencyCode;
      }

      return [{ code, name: info.name, currencyCode, currencyName }];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

const COUNTRY_OPTIONS = buildCountryOptions();

// --------------- Wizard form state ---------------

type WizardData = {
  // Step 1 — Country & Currency
  country_code: string;
  currency_code: string;
  currency_symbol: string;
  currency_name: string;
  // Step 2 — Basic Info + Address
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  location: string;
  started_date: string;
  manager_id: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  // Step 3 — Tax
  has_tax: boolean;
  tax_name: string;
  tax_percent: string;
  tax_registration_number: string;
};

const DEFAULT_WIZARD: WizardData = {
  country_code: '',
  currency_code: '',
  currency_symbol: '',
  currency_name: '',
  name: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  location: '',
  started_date: '',
  manager_id: null,
  status: 'ACTIVE',
  has_tax: false,
  tax_name: '',
  tax_percent: '',
  tax_registration_number: '',
};

// --------------- Utility ---------------

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// --------------- Main Component ---------------

export default function BranchReport() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { page, limit, total, setPage, setTotal, totalPages } = usePagination(5);

  const user = getUserFromToken();
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [branchesRes, managersRes] = await Promise.all([getBranches(), getManagersByRole()]);
      if (branchesRes.success) setBranches(branchesRes.data);
      if (managersRes.success) setManagers(managersRes.data.employees || []);
    } catch {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const getManagerName = (managerId?: string | null) => {
    if (!managerId) return 'Unassigned';
    const manager = managers.find((m) => m.id === managerId);
    return manager ? `${manager.first_name} ${manager.last_name}` : 'Unassigned';
  };

  const filtered = branches.filter((b) =>
    `${b.name} ${b.address} ${b.location}`.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    setTotal(filtered.length);
  }, [filtered.length, setTotal]);

  const totalBranches = branches.length;
  const activeBranches = branches.filter((b) => b.status === 'ACTIVE').length;
  const inactiveBranches = branches.filter((b) => b.status === 'INACTIVE').length;
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const newBranches = branches.filter((b) => new Date(b.started_date) >= twoYearsAgo).length;

  const handleSave = async (data: WizardData) => {
    try {
      setSubmitting(true);
      const managerId = data.manager_id && data.manager_id.trim() !== '' ? data.manager_id : null;

      const payload: CreateBranchPayload | UpdateBranchPayload = {
        name: data.name,
        address: data.address,
        location: data.location,
        manager_id: managerId,
        started_date: data.started_date,
        country_code: data.country_code || undefined,
        currency_code: data.currency_code || undefined,
        currency_symbol: data.currency_symbol || undefined,
        currency_name: data.currency_name || undefined,
        has_tax: data.has_tax,
        tax_name: data.has_tax ? data.tax_name || null : null,
        tax_percent: data.has_tax && data.tax_percent ? Number(data.tax_percent) : null,
        tax_registration_number: data.has_tax ? data.tax_registration_number || null : null,
        city: data.city || undefined,
        state: data.state || undefined,
        postal_code: data.postal_code || undefined,
      };

      if (editingBranch) {
        const res = await updateBranch(editingBranch.id, {
          ...(payload as UpdateBranchPayload),
          status: data.status,
        });
        if (res.success) {
          toast.success('Branch updated successfully');
          await fetchData();
        }
      } else {
        const res = await createBranch(payload as CreateBranchPayload);
        if (res.success) {
          toast.success('Branch created successfully');
          await fetchData();
        }
      }

      setWizardOpen(false);
      setEditingBranch(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || 'Failed to save branch');
    } finally {
      setSubmitting(false);
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
      <div className="bg-bg-muted min-h-screen p-3 sm:p-4 md:p-6 flex items-center justify-center">
        <div className="text-primary text-lg">Loading...</div>
      </div>
    );
  }

  const paginatedFiltered = filtered.slice((page - 1) * limit, page * limit);

  return (
    <div className="bg-bg-muted min-h-screen p-3 sm:p-4 md:p-6 space-y-8 sm:space-y-10">
      <div className="space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">Branches</h3>

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

          {isAdmin && (
            <Button
              className="bg-primary text-white gap-2"
              onClick={() => {
                setEditingBranch(null);
                setWizardOpen(true);
              }}
            >
              <Plus size={16} /> Add Branch
            </Button>
          )}
        </div>

        <div className="rounded-2xl bg-card shadow-sm overflow-hidden border">
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  'BRANCH',
                  'ADDRESS',
                  'LOCATION',
                  'CURRENCY',
                  'MANAGER',
                  'STARTED',
                  'TAX',
                  'STATUS',
                  'ACTION',
                ].map((h) => (
                  <TableHead
                    key={h}
                    className="text-[11px] font-semibold text-primary uppercase px-4 py-3"
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedFiltered.map((b, i) => (
                <TableRow key={b.id} className={i % 2 ? 'bg-blue-50/20' : 'bg-card'}>
                  <TableCell className="px-4 py-3 font-medium">
                    <button
                      className="text-primary hover:underline text-left font-medium"
                      onClick={() => setSelectedBranch(b)}
                    >
                      {b.name}
                    </button>
                  </TableCell>
                  <TableCell className="px-4 py-3">{b.address}</TableCell>
                  <TableCell className="px-4 py-3">{b.location}</TableCell>
                  <TableCell className="px-4 py-3">
                    {b.currency_code ? (
                      <span className="font-mono text-xs font-semibold text-primary">
                        {b.currency_code}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={
                        getManagerName(b.manager_id) === 'Unassigned'
                          ? 'text-slate-400'
                          : 'text-foreground'
                      }
                    >
                      {getManagerName(b.manager_id)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">{formatDate(b.started_date)}</TableCell>
                  <TableCell className="px-4 py-3">
                    {b.has_tax ? (
                      <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        {b.tax_name || 'Tax'} {b.tax_percent}%
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">No tax</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        b.status === 'ACTIVE'
                          ? 'bg-success/10 text-success'
                          : 'bg-danger/10 text-danger'
                      }`}
                    >
                      {b.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    {isAdmin && (
                      <div className="flex gap-3 text-sm">
                        <button
                          className="text-primary hover:underline"
                          onClick={() => {
                            setEditingBranch(b);
                            setWizardOpen(true);
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
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      </div>

      {wizardOpen && (
        <BranchWizard
          initialData={editingBranch}
          managers={managers}
          isSubmitting={submitting}
          onClose={() => {
            setWizardOpen(false);
            setEditingBranch(null);
          }}
          onConfirm={handleSave}
        />
      )}

      {branchToDelete && (
        <ConfirmDeleteModal
          name={branchToDelete.name}
          open={true}
          onCancel={() => setBranchToDelete(null)}
          onConfirm={confirmDelete}
        />
      )}

      {selectedBranch && (
        <BranchDetailModal
          branch={selectedBranch}
          managerName={getManagerName(selectedBranch.manager_id)}
          onClose={() => setSelectedBranch(null)}
        />
      )}
    </div>
  );
}

// --------------- 3-Step Wizard ---------------

const STEPS = ['Country & Currency', 'Address & Details', 'Tax Configuration'];

function BranchWizard({
  initialData,
  managers,
  isSubmitting,
  onClose,
  onConfirm,
}: {
  initialData: Branch | null;
  managers: Employee[];
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (data: WizardData) => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardData>(() => {
    if (!initialData) return DEFAULT_WIZARD;
    return {
      country_code: initialData.country_code || '',
      currency_code: initialData.currency_code || '',
      currency_symbol: initialData.currency_symbol || '',
      currency_name: initialData.currency_name || '',
      name: initialData.name,
      address: initialData.address,
      city: initialData.city || '',
      state: initialData.state || '',
      postal_code: initialData.postal_code || '',
      location: initialData.location,
      started_date: initialData.started_date ? initialData.started_date.split('T')[0] : '',
      manager_id: initialData.manager_id || null,
      status: (initialData.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE',
      has_tax: initialData.has_tax || false,
      tax_name: initialData.tax_name || '',
      tax_percent: initialData.tax_percent != null ? String(initialData.tax_percent) : '',
      tax_registration_number: initialData.tax_registration_number || '',
    };
  });

  const isEditing = !!initialData;

  const next = () => setStep((s) => Math.min(s + 1, 2));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const canProceedStep0 = form.country_code.trim() !== '' && form.currency_code.trim() !== '';
  const canProceedStep1 = form.name.trim() !== '' && form.started_date !== '';
  const canSubmit = form.name.trim() !== '';

  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Update Branch' : 'Add Branch'}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-4">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div
                className={`flex-1 text-center text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg transition-colors ${
                  i === step
                    ? 'bg-primary text-white'
                    : i < step
                      ? 'bg-success/20 text-success'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {i + 1}. {label}
              </div>
              {i < 2 && <div className="w-2 h-0.5 bg-slate-200 shrink-0" />}
            </div>
          ))}
        </div>

        {/* Step 0: Country & Currency */}
        {step === 0 && <Step0 form={form} setForm={setForm} />}

        {/* Step 1: Address & Details */}
        {step === 1 && (
          <Step1 form={form} setForm={setForm} managers={managers} isEditing={isEditing} />
        )}

        {/* Step 2: Tax */}
        {step === 2 && <Step2 form={form} setForm={setForm} />}

        {/* Navigation */}
        <div className="mt-6 flex justify-between gap-3">
          <Button variant="outline" onClick={step === 0 ? onClose : prev}>
            {step === 0 ? (
              'Cancel'
            ) : (
              <>
                <ChevronLeft size={16} /> Back
              </>
            )}
          </Button>

          {step < 2 ? (
            <Button onClick={next} disabled={step === 0 ? !canProceedStep0 : !canProceedStep1}>
              Next <ChevronRight size={16} />
            </Button>
          ) : (
            <Button onClick={() => onConfirm(form)} disabled={isSubmitting || !canSubmit}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Branch' : 'Create Branch'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --------------- Step 0: Country & Currency ---------------

function Step0({
  form,
  setForm,
}: {
  form: WizardData;
  setForm: React.Dispatch<React.SetStateAction<WizardData>>;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      COUNTRY_OPTIONS.filter((c) =>
        `${c.name} ${c.code} ${c.currencyCode}`.toLowerCase().includes(search.toLowerCase()),
      ).slice(0, 50),
    [search],
  );

  const selectedCountry = COUNTRY_OPTIONS.find((c) => c.code === form.country_code);

  const handleSelect = (option: CountryOption) => {
    setForm((prev) => ({
      ...prev,
      country_code: option.code,
      currency_code: option.currencyCode,
      currency_symbol: option.currencyCode, // Gulf ERP: symbol = code
      currency_name: option.currencyName,
    }));
    setSearch('');
  };

  const handleCurrencyOverride = (value: string) => {
    const upper = value.toUpperCase().slice(0, 3);
    let currencyName = '';
    try {
      const dn = new Intl.DisplayNames(['en'], { type: 'currency' });
      currencyName = dn.of(upper) || upper;
    } catch {
      currencyName = upper;
    }
    setForm((prev) => ({
      ...prev,
      currency_code: upper,
      currency_symbol: upper,
      currency_name: currencyName,
    }));
  };

  return (
    <div className="space-y-4">
      <Field label="Country">
        <div className="relative">
          <Input
            placeholder="Search country..."
            value={search || selectedCountry?.name || ''}
            onFocus={() => setSearch('')}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 rounded-xl bg-card border shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          {search && (
            <div className="absolute z-50 mt-1 w-full bg-card border rounded-xl shadow-lg max-h-52 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="px-3 py-2 text-sm text-slate-400">No countries found</p>
              )}
              {filtered.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 flex justify-between items-center"
                  onClick={() => handleSelect(option)}
                >
                  <span>
                    <span className="font-semibold text-slate-700">{option.name}</span>
                    <span className="text-slate-400 ml-1 text-xs">({option.code})</span>
                  </span>
                  <span className="text-xs text-primary font-mono">{option.currencyCode}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Field>

      {form.country_code && (
        <>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                Currency Preview
              </p>
              <p className="text-sm font-semibold text-primary mt-0.5">
                {form.currency_code} — {form.currency_name}
              </p>
            </div>
            <span className="text-2xl font-mono font-bold text-primary opacity-20">
              {form.currency_code}
            </span>
          </div>

          <Field label="Override Currency Code (optional)">
            <Input
              placeholder="e.g. AED"
              value={form.currency_code}
              onChange={(e) => handleCurrencyOverride(e.target.value)}
              maxLength={3}
              className="h-11 rounded-xl bg-card border shadow-sm font-mono uppercase"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Leave as-is unless this country uses a different currency.
            </p>
          </Field>
        </>
      )}
    </div>
  );
}

// --------------- Step 1: Address & Details ---------------

function Step1({
  form,
  setForm,
  managers,
  isEditing,
}: {
  form: WizardData;
  setForm: React.Dispatch<React.SetStateAction<WizardData>>;
  managers: Employee[];
  isEditing: boolean;
}) {
  return (
    <div className="space-y-4">
      <Field label="Branch Name">
        <Input
          placeholder="Full name"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="h-11 rounded-xl bg-card border shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </Field>

      <Field label="Street Address">
        <Input
          placeholder="Street address"
          value={form.address}
          onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          className="h-11 rounded-xl bg-card border shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="City">
          <Input
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
            className="h-11 rounded-xl bg-card border shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </Field>
        <Field label="State / Emirate">
          <Input
            placeholder="State or Emirate"
            value={form.state}
            onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
            className="h-11 rounded-xl bg-card border shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Postal Code">
          <Input
            placeholder="Postal code"
            value={form.postal_code}
            onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))}
            className="h-11 rounded-xl bg-card border shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </Field>
        <Field label="Location / Area">
          <Input
            placeholder="City / Area"
            value={form.location}
            onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            className="h-11 rounded-xl bg-card border shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </Field>
      </div>

      <Field label="Started Date">
        <Input
          type="date"
          value={form.started_date}
          onChange={(e) => setForm((p) => ({ ...p, started_date: e.target.value }))}
          className="h-11 rounded-xl bg-card border shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </Field>

      <Field label="Assign Manager">
        <Select
          value={form.manager_id || 'unassigned'}
          onValueChange={(value) =>
            setForm((p) => ({ ...p, manager_id: value === 'unassigned' ? null : value }))
          }
        >
          <SelectTrigger className="w-full h-11 rounded-xl bg-card border shadow-sm">
            <SelectValue placeholder="Select manager" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned" className="text-muted-foreground italic">
              Not Assigned
            </SelectItem>
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

      {isEditing && (
        <Field label="Branch Status">
          <Select
            value={form.status}
            onValueChange={(value) =>
              setForm((p) => ({ ...p, status: value as 'ACTIVE' | 'INACTIVE' }))
            }
          >
            <SelectTrigger className="w-full h-11 rounded-xl bg-card border shadow-sm">
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
      )}
    </div>
  );
}

// --------------- Step 2: Tax Configuration ---------------

function Step2({
  form,
  setForm,
}: {
  form: WizardData;
  setForm: React.Dispatch<React.SetStateAction<WizardData>>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border p-4 bg-card">
        <div>
          <p className="text-sm font-semibold text-foreground">Does this branch charge tax?</p>
          <p className="text-xs text-slate-400 mt-0.5">Enable to configure VAT or other tax</p>
        </div>
        <button
          type="button"
          onClick={() => setForm((p) => ({ ...p, has_tax: !p.has_tax }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            form.has_tax ? 'bg-primary' : 'bg-slate-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
              form.has_tax ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {form.has_tax && (
        <div className="space-y-4 pt-2">
          <Field label="Tax Name">
            <Input
              placeholder="e.g. VAT"
              value={form.tax_name}
              onChange={(e) => setForm((p) => ({ ...p, tax_name: e.target.value }))}
              className="h-11 rounded-xl bg-card border shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </Field>

          <Field label="Tax Percentage (%)">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="e.g. 5"
              value={form.tax_percent}
              onChange={(e) => setForm((p) => ({ ...p, tax_percent: e.target.value }))}
              className="h-11 rounded-xl bg-card border shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </Field>

          <Field label="Tax Registration Number (optional)">
            <Input
              placeholder="e.g. TRN100123456789003"
              value={form.tax_registration_number}
              onChange={(e) => setForm((p) => ({ ...p, tax_registration_number: e.target.value }))}
              className="h-11 rounded-xl bg-card border shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Required for UAE VAT legal compliance — printed on all invoices.
            </p>
          </Field>

          {form.currency_code && form.tax_percent && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                Tax Preview
              </p>
              <div className="mt-1.5 space-y-0.5 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span>{form.currency_code} 10,000.00</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>
                    {form.tax_name || 'Tax'} ({form.tax_percent}%)
                  </span>
                  <span>
                    {form.currency_code}{' '}
                    {((10000 * Number(form.tax_percent)) / 100)
                      .toFixed(2)
                      .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  </span>
                </div>
                <div className="flex justify-between font-bold border-t border-amber-200 pt-0.5 mt-0.5">
                  <span>Total</span>
                  <span>
                    {form.currency_code}{' '}
                    {(10000 * (1 + Number(form.tax_percent) / 100))
                      .toFixed(2)
                      .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!form.has_tax && (
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center text-slate-400 text-sm">
          No tax will be applied to transactions from this branch.
        </div>
      )}
    </div>
  );
}

// --------------- Delete Confirm Modal ---------------

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
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive shadow-sm">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle>Delete Branch</DialogTitle>
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
          <Button variant="destructive" className="h-12 px-8" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --------------- Branch Detail Modal ---------------

function BranchDetailModal({
  branch,
  managerName,
  onClose,
}: {
  branch: Branch;
  managerName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(branch.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatFullDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{branch.name}</DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">Branch Details</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Branch ID
            </p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-slate-700 flex-1 truncate">{branch.id}</code>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                title="Copy ID"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Address" value={branch.address} fullWidth />
            {branch.city && <DetailField label="City" value={branch.city} />}
            {branch.state && <DetailField label="State / Emirate" value={branch.state} />}
            {branch.postal_code && <DetailField label="Postal Code" value={branch.postal_code} />}
            <DetailField label="Location" value={branch.location} />
            <DetailField label="Manager" value={managerName} />
            <DetailField label="Started Date" value={formatFullDate(branch.started_date)} />
            {branch.currency_code && (
              <DetailField
                label="Currency"
                value={`${branch.currency_code} — ${branch.currency_name || ''}`}
              />
            )}
            {branch.has_tax && (
              <DetailField
                label="Tax"
                value={`${branch.tax_name || 'Tax'} @ ${branch.tax_percent}%`}
              />
            )}
            {branch.tax_registration_number && (
              <DetailField label="TRN" value={branch.tax_registration_number} fullWidth />
            )}
            <DetailField
              label="Status"
              value={
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    branch.status === 'ACTIVE'
                      ? 'bg-success/10 text-success'
                      : 'bg-danger/10 text-danger'
                  }`}
                >
                  {branch.status}
                </span>
              }
            />
            <DetailField label="Created At" value={formatFullDate(branch.created_at)} />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --------------- Shared UI helpers ---------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">
        {label}
      </label>
      {children}
    </div>
  );
}

function DetailField({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-foreground font-medium">{value}</p>
    </div>
  );
}
