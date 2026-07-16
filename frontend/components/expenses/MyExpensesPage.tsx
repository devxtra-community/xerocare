'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Send,
  RotateCcw,
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Banknote,
} from 'lucide-react';
import {
  getMyExpenseRequests,
  createExpenseRequest,
  updateExpenseRequest,
  deleteExpenseRequest,
  submitExpenseRequest,
  type ExpenseRequest,
  type CreateExpenseRequestPayload,
} from '@/lib/employeeExpenses';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { toast } from 'sonner';

import { getActiveCurrency } from '@/lib/currency';
const today = new Date().toISOString().slice(0, 10);

const CATEGORIES = [
  { value: 'TRAVEL', label: '🚗 Travel' },
  { value: 'FUEL', label: '⛽ Fuel' },
  { value: 'ACCOMMODATION', label: '🏨 Accommodation' },
  { value: 'MEALS', label: '🍽️ Meals & Entertainment' },
  { value: 'OFFICE_SUPPLIES', label: '📦 Office Supplies' },
  { value: 'COMMUNICATION', label: '📱 Communication' },
  { value: 'TRANSPORT', label: '🚌 Transport' },
  { value: 'MAINTENANCE', label: '🔧 Maintenance' },
  { value: 'MARKETING', label: '📢 Marketing' },
  { value: 'TRAINING', label: '🎓 Training' },
  { value: 'OTHER', label: '📋 Other' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: <Clock className="h-3 w-3" />,
  },
  SUBMITTED: {
    label: 'Awaiting Approval',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: <Send className="h-3 w-3" />,
  },
  APPROVED: {
    label: 'Approved',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: <XCircle className="h-3 w-3" />,
  },
  PAID: {
    label: 'Paid',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: <Banknote className="h-3 w-3" />,
  },
};

function getCategoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value.replace(/_/g, ' ');
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

function ExpenseFormModal({
  expense,
  currency,
  onClose,
  onSaved,
}: {
  expense?: ExpenseRequest | null;
  currency?: string;
  onClose: () => void;
  onSaved: (id?: string) => void;
}) {
  const [form, setForm] = useState<CreateExpenseRequestPayload>({
    date: expense?.date?.slice(0, 10) ?? today,
    category: expense?.category ?? 'TRAVEL',
    sub_category: expense?.subCategory ?? '',
    description: expense?.description ?? '',
    amount: expense?.amount ?? ('' as unknown as number),
    currency: expense?.currency ?? currency ?? getActiveCurrency(),
    receipt_url: expense?.receiptUrl ?? '',
    notes: expense?.notes ?? '',
  });

  const set = (k: keyof CreateExpenseRequestPayload, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  // useBranchCurrency() is async — update form currency once it resolves.
  // Skip for editing (expense already has a stored currency).
  useEffect(() => {
    if (currency && !expense) {
      setForm((f) => ({ ...f, currency }));
    }
  }, [currency]);

  const qc = useQueryClient();

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = { ...form, amount: Number(form.amount) };
      if (expense?.id) return updateExpenseRequest(expense.id, payload);
      return createExpenseRequest(payload);
    },
    onSuccess: (data) => {
      toast.success(expense ? 'Expense updated' : 'Expense saved as draft');
      qc.invalidateQueries({ queryKey: ['my-expense-requests'] });
      onSaved(data?.id);
    },
    onError: () => toast.error('Failed to save expense'),
  });

  const submitMut = useMutation({
    mutationFn: async () => {
      const payload = { ...form, amount: Number(form.amount) };
      let id = expense?.id;
      if (!id) {
        const created = await createExpenseRequest(payload);
        id = created.id;
      } else {
        await updateExpenseRequest(id, payload);
      }
      await submitExpenseRequest(id!);
      return id;
    },
    onSuccess: () => {
      toast.success('Expense submitted to Finance Manager');
      qc.invalidateQueries({ queryKey: ['my-expense-requests'] });
      onClose();
    },
    onError: () => toast.error('Failed to submit expense'),
  });

  const isEditing = !!expense?.id;
  const isSubmittable = form.description?.length >= 10 && Number(form.amount) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-bold text-slate-800 text-lg">
            {isEditing ? 'Edit Expense Request' : 'Add Expense Request'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isEditing && expense?.status !== 'PENDING' && (
          <div className="px-6 pt-4">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Once submitted, you cannot edit this expense
            </div>
          </div>
        )}

        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date *</label>
              <input
                type="date"
                value={form.date}
                max={today}
                onChange={(e) => set('date', e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Currency</label>
              <div className="mt-1 px-3 py-2 rounded-md border border-border text-sm bg-muted/40 text-muted-foreground">
                {form.currency}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Category *</label>
            <Select value={form.category} onValueChange={(v) => set('category', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Sub-category</label>
            <Input
              value={form.sub_category ?? ''}
              onChange={(e) => set('sub_category', e.target.value)}
              className="mt-1"
              placeholder="e.g. Flight to Dubai, Hotel booking, Uber receipt"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background resize-none"
              placeholder="Describe what this expense was for and why it was needed"
            />
            {form.description && form.description.length < 10 && (
              <p className="text-xs text-red-500 mt-1">Min 10 characters required</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Amount *</label>
            <div className="mt-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                {form.currency}
              </span>
              <Input
                type="number"
                min="0.01"
                max="99999.99"
                step="0.01"
                value={form.amount as unknown as string}
                onChange={(e) => set('amount', e.target.value)}
                className="pl-12"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Receipt URL (optional)
            </label>
            <Input
              value={form.receipt_url ?? ''}
              onChange={(e) => set('receipt_url', e.target.value)}
              className="mt-1"
              placeholder="Paste receipt image URL or leave blank"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background resize-none"
              placeholder="Any additional notes..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0 gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saveMut.isPending || submitMut.isPending}
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || submitMut.isPending || !isSubmittable}
            >
              {saveMut.isPending ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              onClick={() => submitMut.mutate()}
              disabled={saveMut.isPending || submitMut.isPending || !isSubmittable}
              className="bg-primary text-primary-foreground"
            >
              {submitMut.isPending ? 'Submitting...' : 'Save & Submit'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── View Modal ───────────────────────────────────────────────────────────────

function ViewExpenseModal({
  expense,
  onClose,
  onResubmit,
}: {
  expense: ExpenseRequest;
  onClose: () => void;
  onResubmit?: (expense: ExpenseRequest) => void;
}) {
  const cfg = STATUS_CONFIG[expense.status] ?? STATUS_CONFIG.PENDING;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-bold text-slate-800">Expense Request</h2>
            <p className="text-xs text-muted-foreground">{expense.requestNo}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          {expense.status === 'REJECTED' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
                <XCircle className="h-4 w-4" />
                Rejected
                {expense.reviewedByName && ` by ${expense.reviewedByName}`}
                {expense.reviewedAt && ` on ${new Date(expense.reviewedAt).toLocaleDateString()}`}
              </div>
              {expense.rejectionReason && (
                <p className="text-red-600 text-sm">Reason: {expense.rejectionReason}</p>
              )}
            </div>
          )}

          {expense.status === 'APPROVED' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                Approved
                {expense.reviewedByName && ` by ${expense.reviewedByName}`}
                {expense.reviewedAt && ` on ${new Date(expense.reviewedAt).toLocaleDateString()}`}
              </div>
            </div>
          )}

          {expense.status === 'PAID' && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-purple-700 font-semibold">
                <Banknote className="h-4 w-4" />
                Paid on {expense.paidAt ? new Date(expense.paidAt).toLocaleDateString() : 'N/A'}
                {expense.paymentReference && ` — Reference: ${expense.paymentReference}`}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs font-medium text-muted-foreground">Date</span>
              <p className="font-medium">{expense.date?.slice(0, 10)}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Status</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${cfg.color}`}
                >
                  {cfg.icon}
                  {cfg.label}
                </span>
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Category</span>
              <p className="font-medium">{getCategoryLabel(expense.category)}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Amount</span>
              <p className="font-bold text-red-600">
                {formatCurrency(Number(expense.amount), expense.currency)}
              </p>
            </div>
            {expense.subCategory && (
              <div className="col-span-2">
                <span className="text-xs font-medium text-muted-foreground">Sub-category</span>
                <p className="font-medium">{expense.subCategory}</p>
              </div>
            )}
            <div className="col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Description</span>
              <p className="text-slate-700">{expense.description}</p>
            </div>
            {expense.notes && (
              <div className="col-span-2">
                <span className="text-xs font-medium text-muted-foreground">Notes</span>
                <p className="text-slate-600 text-sm">{expense.notes}</p>
              </div>
            )}
            {expense.receiptUrl && (
              <div className="col-span-2">
                <span className="text-xs font-medium text-muted-foreground">Receipt</span>
                <a
                  href={expense.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-primary text-sm hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  View Receipt
                </a>
              </div>
            )}
            {expense.submittedAt && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Submitted</span>
                <p className="text-sm">{new Date(expense.submittedAt).toLocaleString()}</p>
              </div>
            )}
            <div>
              <span className="text-xs font-medium text-muted-foreground">Branch</span>
              <p className="text-sm">{expense.branchName}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {expense.status === 'REJECTED' && onResubmit && (
            <Button
              onClick={() => {
                onClose();
                onResubmit(expense);
              }}
              className="bg-blue-600 text-white"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Re-submit as New
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Submit Confirm Dialog ────────────────────────────────────────────────────

function SubmitConfirmDialog({
  expense,
  onConfirm,
  onCancel,
  loading,
}: {
  expense: ExpenseRequest;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Send className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-800">Submit this expense?</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Once submitted, you cannot edit it until the Finance Manager reviews it.
          </p>
          <div className="bg-muted/40 rounded-xl p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-red-600">
                {formatCurrency(Number(expense.amount), expense.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium">{getCategoryLabel(expense.category)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            This will be sent to your Finance Manager for review.
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <Button variant="outline" onClick={onCancel} disabled={loading} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-primary text-primary-foreground"
          >
            {loading ? 'Submitting...' : 'Yes, Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function MyExpensesPage({ currency: currencyProp }: { currency?: string }) {
  const branchCurrency = useBranchCurrency();
  const currency = currencyProp ?? branchCurrency;
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ExpenseRequest | null>(null);
  const [viewing, setViewing] = useState<ExpenseRequest | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState<ExpenseRequest | null>(null);

  const { data: requests = [], isLoading } = useQuery<ExpenseRequest[]>({
    queryKey: ['my-expense-requests', statusFilter, categoryFilter],
    queryFn: () =>
      getMyExpenseRequests({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
      }),
    staleTime: 30_000,
  });

  const submitMut = useMutation({
    mutationFn: (id: string) => submitExpenseRequest(id),
    onSuccess: () => {
      toast.success('Expense submitted to Finance Manager');
      qc.invalidateQueries({ queryKey: ['my-expense-requests'] });
      setConfirmSubmit(null);
    },
    onError: () => toast.error('Failed to submit'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteExpenseRequest(id),
    onSuccess: () => {
      toast.success('Expense deleted');
      qc.invalidateQueries({ queryKey: ['my-expense-requests'] });
    },
    onError: () => toast.error('Failed to delete'),
  });

  const handleResubmit = (expense: ExpenseRequest) => {
    setEditing({
      ...expense,
      id: '',
      status: 'PENDING',
      requestNo: '',
      submittedAt: undefined,
      reviewedBy: undefined,
      reviewedByName: undefined,
      reviewedAt: undefined,
      rejectionReason: undefined,
    } as ExpenseRequest);
    setShowModal(true);
  };

  const filtered = useMemo(
    () =>
      requests.filter((r) => {
        const matchSearch =
          !search ||
          r.description?.toLowerCase().includes(search.toLowerCase()) ||
          r.requestNo?.toLowerCase().includes(search.toLowerCase()) ||
          r.category?.toLowerCase().includes(search.toLowerCase());
        return matchSearch;
      }),
    [requests, search],
  );

  const summary = useMemo(() => {
    const all = requests;
    const sum = (status: string) => ({
      count: all.filter((r) => r.status === status).length,
      total: all.filter((r) => r.status === status).reduce((s, r) => s + Number(r.amount), 0),
    });
    return {
      pending: sum('PENDING'),
      submitted: sum('SUBMITTED'),
      approved: sum('APPROVED'),
      rejected: sum('REJECTED'),
      paid: sum('PAID'),
    };
  }, [requests]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">My Expenses</h3>
          <p className="text-muted-foreground">Submit and track your expense requests</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="gap-2 bg-primary text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          title="Draft"
          value={summary.pending.count.toString()}
          subtitle={formatCurrency(summary.pending.total, currency)}
        />
        <StatCard
          title="Submitted"
          value={summary.submitted.count.toString()}
          subtitle={formatCurrency(summary.submitted.total, currency)}
        />
        <StatCard
          title="Approved"
          value={summary.approved.count.toString()}
          subtitle={formatCurrency(summary.approved.total, currency)}
        />
        <StatCard
          title="Rejected"
          value={summary.rejected.count.toString()}
          subtitle={formatCurrency(summary.rejected.total, currency)}
        />
        <StatCard
          title="Paid"
          value={summary.paid.count.toString()}
          subtitle={formatCurrency(summary.paid.total, currency)}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10 bg-muted/50 border-none"
            placeholder="Search description, request # or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PENDING">Draft</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="pl-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Date
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Request #
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Category
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Description
              </TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Amount
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pr-4">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <FileText className="h-12 w-12 opacity-30" />
                    <p className="font-medium">No expense requests yet</p>
                    <p className="text-sm">
                      Click &ldquo;Add Expense&rdquo; to submit your first expense
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PENDING;
                return (
                  <TableRow
                    key={r.id}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                    onClick={() => setViewing(r)}
                  >
                    <TableCell className="pl-4 font-mono text-xs text-muted-foreground">
                      {r.date?.slice(0, 10)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-blue-600 font-bold">
                      {r.requestNo || '—'}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {getCategoryLabel(r.category)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {r.description}
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      {formatCurrency(Number(r.amount), r.currency)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cfg.color}`}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewing(r)}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                          title="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {r.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => {
                                setEditing(r);
                                setShowModal(true);
                              }}
                              className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmSubmit(r)}
                              className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600"
                              title="Submit for approval"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this expense?')) deleteMut.mutate(r.id);
                              }}
                              className="p-1.5 rounded-md hover:bg-red-50 text-red-500"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        {r.status === 'REJECTED' && (
                          <button
                            onClick={() => handleResubmit(r)}
                            className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                            title="Re-submit as new"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modals */}
      {showModal && (
        <ExpenseFormModal
          expense={editing}
          currency={currency}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['my-expense-requests'] });
          }}
        />
      )}

      {viewing && (
        <ViewExpenseModal
          expense={viewing}
          onClose={() => setViewing(null)}
          onResubmit={handleResubmit}
        />
      )}

      {confirmSubmit && (
        <SubmitConfirmDialog
          expense={confirmSubmit}
          onConfirm={() => submitMut.mutate(confirmSubmit.id)}
          onCancel={() => setConfirmSubmit(null)}
          loading={submitMut.isPending}
        />
      )}
    </div>
  );
}
