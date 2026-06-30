'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Download,
  Plus,
  Search,
  Filter,
  X,
  CreditCard,
  BarChart2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  fetchManualPayables,
  createManualPayable,
  recordPayablePayment,
  fetchCashBankAccounts,
  fetchPayableCharts,
  type ManualPayable,
} from '@/lib/finance/accountsApi';
import { DonutChart, HorizontalBarChart, SimpleBarChart } from '@/components/accounts/charts';
import {
  fetchPurchases,
  agingBucket,
  fetchBranches,
  type PurchaseOrder,
} from '@/lib/finance/accounts';
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

const AGING_BUCKETS = ['Current', '1-30 days', '31-60 days', '61-90 days', '90+ days'];
const AGING_COLORS: Record<string, string> = {
  Current: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '1-30 days': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  '31-60 days': 'bg-orange-100 text-orange-700 border-orange-200',
  '61-90 days': 'bg-red-100 text-red-700 border-red-200',
  '90+ days': 'bg-red-200 text-red-800 border-red-300',
};

const PAYABLE_TYPES = [
  'VENDOR_INVOICE',
  'SALARY_PAYABLE',
  'RENT_PAYABLE',
  'UTILITY_PAYABLE',
  'OTHER',
];
const today = new Date().toISOString().slice(0, 10);

function AddPayableModal({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accounts: _,
  branches,
  onClose,
  onSaved,
}: {
  accounts: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    type: 'VENDOR_INVOICE',
    payableTo: '',
    description: '',
    amount: '',
    currency: 'AED',
    issueDate: today,
    dueDate: today,
    branchId: branches[0]?.id ?? '',
    notes: '',
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => createManualPayable({ ...form, amount: parseFloat(form.amount) }),
    onSuccess: () => {
      toast.success('Payable created');
      qc.invalidateQueries({ queryKey: ['manual-payables'] });
      onSaved();
    },
    onError: () => toast.error('Failed to create'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-slate-800">Add Payable</h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Type</label>
            <Select value={form.type} onValueChange={(v) => set('type', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYABLE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Payable To *</label>
            <Input
              value={form.payableTo}
              onChange={(e) => set('payableTo', e.target.value)}
              className="mt-1"
              placeholder="Vendor / Employee name"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Amount</label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                className="mt-1"
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
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Issue Date</label>
              <input
                type="date"
                value={form.issueDate}
                onChange={(e) => set('issueDate', e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background"
              />
            </div>
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
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.amount || !form.payableTo}
            className="flex-1"
          >
            {mut.isPending ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({
  payable,
  accounts,
  onClose,
}: {
  payable: ManualPayable;
  accounts: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    paymentDate: today,
    amount: payable.outstanding.toString(),
    paidFromAccount: accounts[0]?.id ?? '',
    paymentMode: 'Bank Transfer',
    referenceNo: '',
    notes: '',
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () =>
      recordPayablePayment(payable.id, { ...form, amount: parseFloat(form.amount) }),
    onSuccess: () => {
      toast.success('Payment recorded');
      qc.invalidateQueries({ queryKey: ['manual-payables'] });
      onClose();
    },
    onError: () => toast.error('Failed to record payment'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-slate-800">Record Payment</h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="p-3 rounded-lg bg-amber-50 text-sm">
            <p className="font-medium text-slate-800">{payable.payableTo}</p>
            <p className="text-muted-foreground text-xs">
              Outstanding: {formatCurrency(payable.outstanding, payable.currency)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Payment Date</label>
              <input
                type="date"
                value={form.paymentDate}
                onChange={(e) => set('paymentDate', e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Amount</label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Pay From Account</label>
            <Select value={form.paidFromAccount} onValueChange={(v) => set('paidFromAccount', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Payment Mode</label>
            <Select value={form.paymentMode} onValueChange={(v) => set('paymentMode', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['Cash', 'Bank Transfer', 'Cheque', 'Card'].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Reference #</label>
            <Input
              value={form.referenceNo}
              onChange={(e) => set('referenceNo', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="flex-1">
            {mut.isPending ? 'Saving...' : 'Record'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AccountsPayablePage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [agingFilter, setAgingFilter] = useState('ALL');
  const [showAdd, setShowAdd] = useState(false);
  const [payingFor, setPayingFor] = useState<ManualPayable | null>(null);
  const [chartsOpen, setChartsOpen] = useState(true);

  const {
    data: manualPayables = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<ManualPayable[]>({
    queryKey: ['manual-payables'],
    queryFn: () => fetchManualPayables(),
    staleTime: 30_000,
  });

  const { data: purchases = [] } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchases-ap'],
    queryFn: () => fetchPurchases(),
    staleTime: 60_000,
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

  const { data: payCharts } = useQuery({
    queryKey: ['payable-charts'],
    queryFn: () =>
      fetchPayableCharts() as Promise<{
        byType: { name: string; value: number }[];
        topVendors: { name: string; value: number }[];
        monthly: { month: string; paid: number }[];
      }>,
    staleTime: 120_000,
  });

  // Merge purchase orders + manual payables
  const allPayables = useMemo(() => {
    const fromPurchases = purchases.map((p) => ({
      id: p.id,
      referenceNo: `PO-${p.id?.slice(0, 8)}`,
      type: 'VENDOR_INVOICE',
      payableTo: p.vendorName,
      amount: p.totalCost,
      currency: p.currency ?? 'AED',
      issueDate: p.createdAt,
      dueDate: p.createdAt,
      amountPaid: 0,
      outstanding: p.totalCost,
      status: 'PENDING',
      branchId: p.branchId,
      aging: p.createdAt ? agingBucket(p.createdAt) : 'Current',
      isPurchase: true,
    }));
    const fromManual = manualPayables.map((p) => ({ ...p, isPurchase: false }));
    return [...fromManual, ...fromPurchases];
  }, [purchases, manualPayables]);

  const filtered = useMemo(
    () =>
      allPayables.filter((p) => {
        const matchType = typeFilter === 'ALL' || p.type === typeFilter;
        const matchAging = agingFilter === 'ALL' || p.aging === agingFilter;
        const matchSearch =
          !search ||
          p.payableTo?.toLowerCase().includes(search.toLowerCase()) ||
          p.referenceNo?.toLowerCase().includes(search.toLowerCase());
        return matchType && matchAging && matchSearch;
      }),
    [allPayables, typeFilter, agingFilter, search],
  );

  const totalPayable = allPayables.reduce((s, p) => s + (p.outstanding ?? 0), 0);
  const agingTotals = AGING_BUCKETS.map((b) => ({
    bucket: b,
    total: allPayables.filter((p) => p.aging === b).reduce((s, p) => s + (p.outstanding ?? 0), 0),
  }));

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((p) => ({
        'Ref #': p.referenceNo,
        'Payable To': p.payableTo,
        Type: p.type,
        'Issue Date': p.issueDate?.slice(0, 10),
        'Due Date': p.dueDate?.slice(0, 10),
        Amount: p.amount,
        Paid: p.amountPaid,
        Outstanding: p.outstanding,
        Aging: p.aging,
        Status: p.status,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payables');
    XLSX.writeFile(wb, `Payables_${today}.xlsx`);
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
          <p className="text-red-700 font-medium">Failed to load payables. Please retry.</p>
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
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Accounts Payable</h3>
          <p className="text-muted-foreground">
            Vendor obligations, aging analysis, and payment management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={exportExcel} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Payable
          </Button>
        </div>
      </div>

      {/* Aging Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Total Payable"
          value={formatCurrency(totalPayable)}
          subtitle="All payables"
        />
        {AGING_BUCKETS.map((b) => (
          <StatCard
            key={b}
            title={b}
            value={formatCurrency(agingTotals.find((a) => a.bucket === b)?.total ?? 0)}
            subtitle=""
          />
        ))}
      </div>

      {/* Charts section */}
      <div className="rounded-2xl bg-card shadow-sm border border-slate-100">
        <button
          onClick={() => setChartsOpen((o) => !o)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl"
        >
          <span className="flex items-center gap-2 font-semibold text-gray-800">
            <BarChart2 className="h-4 w-4 text-amber-500" />
            AP Analytics
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
                AP Aging Analysis
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={agingTotals} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ borderRadius: '10px', fontSize: '12px' }}
                  />
                  <Bar dataKey="total" name="Payable" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Payable by Type
              </h4>
              <DonutChart data={payCharts?.byType ?? []} height={200} />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Top 5 Vendors</h4>
              <HorizontalBarChart data={payCharts?.topVendors ?? []} height={200} color="#f59e0b" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Monthly Payments
              </h4>
              <SimpleBarChart
                data={payCharts?.monthly ?? []}
                xKey="month"
                bars={[{ key: 'paid', color: '#8b5cf6', label: 'Paid' }]}
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
            placeholder="Search payable to or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              {PAYABLE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={agingFilter} onValueChange={setAgingFilter}>
            <SelectTrigger className="w-40 bg-card border-border">
              <SelectValue placeholder="All Aging" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Aging</SelectItem>
              {AGING_BUCKETS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
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
                Payable To
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Ref #
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Type
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Due Date
              </TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Amount
              </TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Paid
              </TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Outstanding
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Aging
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pr-4">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                  No payables found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id} className="hover:bg-blue-50/50 transition-colors">
                  <TableCell className="pl-4 font-medium text-slate-800">{p.payableTo}</TableCell>
                  <TableCell className="font-mono text-xs text-amber-600 font-bold">
                    {p.referenceNo}
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      {p.type.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    <span
                      className={
                        p.aging !== 'Current' ? 'text-red-600 font-medium' : 'text-muted-foreground'
                      }
                    >
                      {p.dueDate?.slice(0, 10) ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {formatCurrency(p.amount, p.currency)}
                  </TableCell>
                  <TableCell className="text-right text-emerald-600 font-medium text-sm">
                    {formatCurrency(p.amountPaid, p.currency)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-800">
                    {formatCurrency(p.outstanding ?? 0, p.currency)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${AGING_COLORS[p.aging] ?? ''}`}
                    >
                      {p.aging}
                    </span>
                  </TableCell>
                  <TableCell className="pr-4">
                    {!p.isPurchase && (p.outstanding ?? 0) > 0 && (
                      <button
                        onClick={() => setPayingFor(p as unknown as ManualPayable)}
                        className="p-1.5 rounded-md hover:bg-amber-50 text-amber-600"
                        title="Record Payment"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showAdd && (
        <AddPayableModal
          accounts={accounts}
          branches={branches}
          onClose={() => setShowAdd(false)}
          onSaved={() => setShowAdd(false)}
        />
      )}
      {payingFor && (
        <PaymentModal payable={payingFor} accounts={accounts} onClose={() => setPayingFor(null)} />
      )}
    </div>
  );
}
