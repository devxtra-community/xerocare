'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Download,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Trash2,
  Pencil,
  X,
  BarChart2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  fetchExpenseEntries,
  createExpenseEntry,
  updateExpenseEntry,
  approveExpenseEntry,
  deleteExpenseEntry,
  fetchCashBankAccounts,
  fetchExpenseCharts,
  type ExpenseEntry,
} from '@/lib/finance/accountsApi';
import { StackedBarChart, SimpleBarChart } from '@/components/accounts/charts';
import { fetchBranches } from '@/lib/finance/accounts';
import { formatCurrency } from '@/lib/format';
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
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const EXPENSE_CATEGORIES = [
  'SALARY',
  'TRAVEL',
  'RENT',
  'UTILITIES',
  'SPARE_PARTS',
  'LABOUR',
  'VENDOR_PURCHASE',
  'MARKETING',
  'MAINTENANCE',
  'INSURANCE',
  'OTHER',
];

const CATEGORY_COLORS: Record<string, string> = {
  SALARY: '#6366f1',
  TRAVEL: '#f59e0b',
  RENT: '#3b82f6',
  UTILITIES: '#10b981',
  SPARE_PARTS: '#ef4444',
  LABOUR: '#8b5cf6',
  VENDOR_PURCHASE: '#ec4899',
  MARKETING: '#14b8a6',
  MAINTENANCE: '#f97316',
  INSURANCE: '#06b6d4',
  OTHER: '#94a3b8',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PAID: 'bg-blue-100 text-blue-700 border-blue-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
};

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Cheque', 'Card'];

const today = new Date().toISOString().slice(0, 10);
const thisMonthStart = `${today.slice(0, 7)}-01`;

function ExpenseModal({
  expense,
  accounts,
  branches,
  onClose,
  onSaved,
}: {
  expense?: ExpenseEntry | null;
  accounts: { id: string; name: string; type: string }[];
  branches: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    expenseNo: expense?.expenseNo ?? '',
    date: expense?.date?.slice(0, 10) ?? today,
    category: expense?.category ?? 'OTHER',
    subCategory: expense?.subCategory ?? '',
    branchId: expense?.branchId ?? branches[0]?.id ?? '',
    description: expense?.description ?? '',
    amount: expense?.amount?.toString() ?? '',
    currency: expense?.currency ?? 'AED',
    vatIncluded: false,
    vatAmount: expense?.vatAmount?.toString() ?? '0',
    netAmount: expense?.netAmount?.toString() ?? '',
    status: expense?.status ?? 'PENDING',
    paidFrom: expense?.paidFrom ?? '',
    paymentDate: expense?.paymentDate?.slice(0, 10) ?? today,
    paymentMode: expense?.paymentMode ?? 'Cash',
    referenceNo: expense?.referenceNo ?? '',
    notes: expense?.notes ?? '',
  });

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleAmountChange = (val: string) => {
    const amount = parseFloat(val) || 0;
    const vatAmt = form.vatIncluded ? parseFloat(form.vatAmount) || 0 : 0;
    set('amount', val);
    set('netAmount', (amount - vatAmt).toFixed(2));
  };

  const handleVatChange = (val: string) => {
    const amount = parseFloat(form.amount) || 0;
    const vatAmt = parseFloat(val) || 0;
    set('vatAmount', val);
    set('netAmount', (amount - vatAmt).toFixed(2));
  };

  const qc = useQueryClient();
  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        vatAmount: parseFloat(form.vatAmount) || 0,
        netAmount: parseFloat(form.netAmount) || parseFloat(form.amount),
        paidFrom: form.paidFrom || undefined,
      };
      if (expense?.id) return updateExpenseEntry(expense.id, payload);
      return createExpenseEntry(payload);
    },
    onSuccess: () => {
      toast.success(expense ? 'Expense updated' : 'Expense created');
      qc.invalidateQueries({ queryKey: ['expense-entries'] });
      onSaved();
    },
    onError: () => toast.error('Failed to save expense'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-slate-800">{expense ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 px-6 pt-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${step >= s ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>
        <p className="px-6 pt-2 text-xs text-muted-foreground">
          Step {step} of 4 — {['Basic Info', 'Amount & VAT', 'Payment', 'Notes'][step - 1]}
        </p>

        <div className="px-6 py-4 space-y-3 max-h-96 overflow-y-auto">
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Expense #</label>
                  <Input
                    value={form.expenseNo}
                    onChange={(e) => set('expenseNo', e.target.value)}
                    placeholder="Auto-generated"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => set('date', e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <Select value={form.category} onValueChange={(v) => set('category', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Branch</label>
                <Select value={form.branchId} onValueChange={(v) => set('branchId', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description *</label>
                <Input
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  className="mt-1"
                  placeholder="What is this expense for?"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Amount</label>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="mt-1"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Currency</label>
                  <Select value={form.currency} onValueChange={(v) => set('currency', v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AED">AED</SelectItem>
                      <SelectItem value="QAR">QAR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="vatIncluded"
                  checked={form.vatIncluded}
                  onChange={(e) => set('vatIncluded', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="vatIncluded" className="text-sm">
                  VAT Included
                </label>
              </div>
              {form.vatIncluded && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">VAT Amount</label>
                    <Input
                      type="number"
                      value={form.vatAmount}
                      onChange={(e) => handleVatChange(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Net Amount</label>
                    <Input value={form.netAmount} readOnly className="mt-1 bg-muted/40" />
                  </div>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={form.status} onValueChange={(v) => set('status', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.status === 'PAID' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Paid From Account
                    </label>
                    <Select value={form.paidFrom} onValueChange={(v) => set('paidFrom', v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} ({a.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Payment Date
                      </label>
                      <input
                        type="date"
                        value={form.paymentDate}
                        onChange={(e) => set('paymentDate', e.target.value)}
                        className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Payment Mode
                      </label>
                      <Select value={form.paymentMode} onValueChange={(v) => set('paymentMode', v)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_MODES.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Reference #</label>
                    <Input
                      value={form.referenceNo}
                      onChange={(e) => set('referenceNo', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {step === 4 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={5}
                className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background resize-none"
                placeholder="Any additional notes..."
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <Button
            variant="outline"
            onClick={step > 1 ? () => setStep((s) => s - 1) : onClose}
            disabled={saveMut.isPending}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step < 4 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!form.description || !form.amount}
            >
              Next
            </Button>
          ) : (
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Saving...' : expense ? 'Update' : 'Create'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExpenseManagementPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState(thisMonthStart);
  const [toDate, setToDate] = useState(today);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ExpenseEntry | null>(null);
  const [chartsOpen, setChartsOpen] = useState(true);

  const qc = useQueryClient();

  const {
    data: expenses = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<ExpenseEntry[]>({
    queryKey: ['expense-entries', fromDate, toDate],
    queryFn: () => fetchExpenseEntries({ fromDate, toDate }),
    staleTime: 30_000,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['cash-bank-accounts'],
    queryFn: () => fetchCashBankAccounts(),
    staleTime: 60_000,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchBranches(),
    staleTime: 300_000,
  });

  const { data: chartData } = useQuery({
    queryKey: ['expense-charts'],
    queryFn: () =>
      fetchExpenseCharts() as Promise<{
        monthlyTrend: Record<string, unknown>[];
        categories: string[];
        categoryDonut: { name: string; value: number }[];
        statusDistribution: { name: string; value: number }[];
        topMonths: { month: string; total: number }[];
      }>,
    staleTime: 120_000,
  });

  const approveMut = useMutation({
    mutationFn: approveExpenseEntry,
    onSuccess: () => {
      toast.success('Expense approved');
      qc.invalidateQueries({ queryKey: ['expense-entries'] });
    },
    onError: () => toast.error('Failed to approve'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteExpenseEntry,
    onSuccess: () => {
      toast.success('Expense deleted');
      qc.invalidateQueries({ queryKey: ['expense-entries'] });
    },
    onError: () => toast.error('Failed to delete'),
  });

  const filtered = useMemo(
    () =>
      expenses.filter((e) => {
        const matchCat = categoryFilter === 'ALL' || e.category === categoryFilter;
        const matchStatus = statusFilter === 'ALL' || e.status === statusFilter;
        const matchSearch =
          !search ||
          e.description?.toLowerCase().includes(search.toLowerCase()) ||
          e.expenseNo?.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchStatus && matchSearch;
      }),
    [expenses, categoryFilter, statusFilter, search],
  );

  const totalMonth = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const pendingCount = expenses.filter((e) => e.status === 'PENDING').length;
  const approvedTotal = expenses
    .filter((e) => e.status === 'APPROVED')
    .reduce((s, e) => s + Number(e.amount), 0);

  const donutData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] ?? 0) + Number(e.amount);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((e) => ({
        'Expense #': e.expenseNo,
        Date: e.date,
        Category: e.category,
        Description: e.description,
        Amount: e.amount,
        Currency: e.currency,
        Status: e.status,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    XLSX.writeFile(wb, `Expenses_${fromDate}_${toDate}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="bg-blue-50/50 min-h-full p-6 flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-blue-50/50 min-h-full p-6 flex items-center justify-center">
        <div className="rounded-xl bg-red-50 border border-red-200 p-8 text-center space-y-3 max-w-sm w-full">
          <p className="text-red-700 font-medium">Failed to load expenses. Please retry.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Expense Management</h3>
          <p className="text-muted-foreground">
            Track, approve, and categorize all business expenses
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
          />
          <Button onClick={exportExcel} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setShowModal(true);
            }}
            className="gap-2 bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="This Period Total"
          value={formatCurrency(totalMonth)}
          subtitle="All categories"
        />
        <StatCard title="Approved" value={formatCurrency(approvedTotal)} subtitle="This period" />
        <StatCard
          title="Pending Approval"
          value={pendingCount.toString()}
          subtitle="Awaiting review"
        />
        <StatCard title="Entries" value={expenses.length.toString()} subtitle="Total records" />
      </div>

      {/* Charts section */}
      <div className="rounded-2xl bg-card shadow-sm border border-slate-100">
        <button
          onClick={() => setChartsOpen((o) => !o)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl"
        >
          <span className="flex items-center gap-2 font-semibold text-gray-800">
            <BarChart2 className="h-4 w-4 text-blue-500" />
            Analytics & Charts
          </span>
          {chartsOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>
        {chartsOpen && (
          <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Monthly Trend (Stacked)
              </h4>
              <StackedBarChart
                data={chartData?.monthlyTrend ?? []}
                xKey="month"
                keys={chartData?.categories ?? EXPENSE_CATEGORIES}
              />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Expense Breakdown
              </h4>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    cx="40%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    formatter={(v) => <span className="text-xs">{v.replace(/_/g, ' ')}</span>}
                  />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Status Distribution
              </h4>
              <SimpleBarChart
                data={chartData?.statusDistribution ?? []}
                xKey="name"
                bars={[{ key: 'value', color: '#3b82f6', label: 'Amount' }]}
                height={200}
              />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Top 6 Months by Spend
              </h4>
              <SimpleBarChart
                data={chartData?.topMonths ?? []}
                xKey="month"
                bars={[{ key: 'total', color: '#10b981', label: 'Total' }]}
                height={200}
              />
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10 bg-muted/50 border-none"
            placeholder="Search description or expense #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-slate-100 p-1">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="pl-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Date
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Expense #
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
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  No expenses found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((e) => (
                <TableRow key={e.id} className="hover:bg-blue-50/50 transition-colors">
                  <TableCell className="pl-4 font-mono text-xs text-muted-foreground">
                    {e.date?.slice(0, 10)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-blue-600 font-bold">
                    {e.expenseNo}
                  </TableCell>
                  <TableCell>
                    <span
                      className="px-2 py-0.5 rounded-md text-xs font-semibold"
                      style={{
                        background: `${CATEGORY_COLORS[e.category] ?? '#94a3b8'}20`,
                        color: CATEGORY_COLORS[e.category] ?? '#94a3b8',
                      }}
                    >
                      {e.category.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                    {e.description}
                  </TableCell>
                  <TableCell className="text-right font-bold text-red-600">
                    {formatCurrency(Number(e.amount), e.currency)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${STATUS_BADGE[e.status] ?? ''}`}
                    >
                      {e.status}
                    </span>
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center gap-1">
                      {e.status === 'PENDING' && (
                        <button
                          onClick={() => approveMut.mutate(e.id)}
                          title="Approve"
                          className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditing(e);
                          setShowModal(true);
                        }}
                        className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this expense?')) deleteMut.mutate(e.id);
                        }}
                        className="p-1.5 rounded-md hover:bg-red-50 text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showModal && (
        <ExpenseModal
          expense={editing}
          accounts={accounts}
          branches={branches}
          onClose={() => setShowModal(false)}
          onSaved={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
