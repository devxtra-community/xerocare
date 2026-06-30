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
  fetchManualReceivables,
  createManualReceivable,
  recordReceivablePayment,
  fetchCashBankAccounts,
  fetchReceivableCharts,
  type ManualReceivable,
} from '@/lib/finance/accountsApi';
import { SimpleLineChart, DonutChart, HorizontalBarChart } from '@/components/accounts/charts';
import {
  fetchARInvoices,
  agingBucket,
  fetchBranches,
  type InvoiceSummary,
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

const RECEIVABLE_TYPES = ['CUSTOMER_INVOICE', 'SECURITY_DEPOSIT', 'ADVANCE_PAYMENT', 'OTHER'];
const today = new Date().toISOString().slice(0, 10);

function AddReceivableModal({
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
    type: 'CUSTOMER_INVOICE',
    customerName: '',
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
    mutationFn: () => createManualReceivable({ ...form, amount: parseFloat(form.amount) }),
    onSuccess: () => {
      toast.success('Receivable created');
      qc.invalidateQueries({ queryKey: ['manual-receivables'] });
      onSaved();
    },
    onError: () => toast.error('Failed to create'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-slate-800">Add Receivable</h2>
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
                {RECEIVABLE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Customer Name</label>
            <Input
              value={form.customerName}
              onChange={(e) => set('customerName', e.target.value)}
              className="mt-1"
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
            disabled={mut.isPending || !form.amount}
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
  receivable,
  accounts,
  onClose,
}: {
  receivable: ManualReceivable;
  accounts: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    paymentDate: today,
    amount: receivable.outstanding.toString(),
    paidToAccount: accounts[0]?.id ?? '',
    paymentMode: 'Bank Transfer',
    referenceNo: '',
    notes: '',
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () =>
      recordReceivablePayment(receivable.id, { ...form, amount: parseFloat(form.amount) }),
    onSuccess: () => {
      toast.success('Payment recorded');
      qc.invalidateQueries({ queryKey: ['manual-receivables'] });
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
          <div className="p-3 rounded-lg bg-blue-50 text-sm">
            <p className="font-medium text-slate-800">{receivable.customerName}</p>
            <p className="text-muted-foreground text-xs">
              Outstanding: {formatCurrency(receivable.outstanding, receivable.currency)}
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
            <label className="text-xs font-medium text-muted-foreground">Paid To Account</label>
            <Select value={form.paidToAccount} onValueChange={(v) => set('paidToAccount', v)}>
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

export default function AccountsReceivablePage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [agingFilter, setAgingFilter] = useState('ALL');
  const [showAdd, setShowAdd] = useState(false);
  const [payingFor, setPayingFor] = useState<ManualReceivable | null>(null);
  const [chartsOpen, setChartsOpen] = useState(true);

  const {
    data: manualRcv = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<ManualReceivable[]>({
    queryKey: ['manual-receivables'],
    queryFn: () => fetchManualReceivables(),
    staleTime: 30_000,
  });

  const { data: invoices = [] } = useQuery<InvoiceSummary[]>({
    queryKey: ['ar-invoices'],
    queryFn: () => fetchARInvoices(),
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

  const { data: rcvCharts } = useQuery({
    queryKey: ['receivable-charts'],
    queryFn: () =>
      fetchReceivableCharts() as Promise<{
        collectionRate: { month: string; issued: number; collected: number; rate: number }[];
        byType: { name: string; value: number }[];
        topCustomers: { name: string; value: number }[];
      }>,
    staleTime: 120_000,
  });

  // Merge invoice AR + manual receivables into unified view
  const allReceivables = useMemo(() => {
    const fromInvoices = invoices.map((inv) => ({
      id: inv.id,
      referenceNo: inv.invoiceNumber,
      type: inv.saleType,
      customerName: inv.customerName,
      amount: inv.totalAmount,
      currency: inv.currency,
      issueDate: inv.createdAt,
      dueDate: inv.dueDate ?? inv.createdAt,
      amountPaid: inv.paidAmount ?? 0,
      outstanding: inv.totalAmount - (inv.paidAmount ?? 0),
      status: inv.status,
      branchId: inv.branchId,
      aging: inv.dueDate ? agingBucket(inv.dueDate) : 'Current',
      isInvoice: true,
    }));
    const fromManual = manualRcv.map((r) => ({ ...r, isInvoice: false }));
    return [...fromInvoices, ...fromManual];
  }, [invoices, manualRcv]);

  const filtered = useMemo(
    () =>
      allReceivables.filter((r) => {
        const matchType = typeFilter === 'ALL' || r.type === typeFilter;
        const matchAging = agingFilter === 'ALL' || r.aging === agingFilter;
        const matchSearch =
          !search ||
          r.customerName?.toLowerCase().includes(search.toLowerCase()) ||
          r.referenceNo?.toLowerCase().includes(search.toLowerCase());
        return matchType && matchAging && matchSearch;
      }),
    [allReceivables, typeFilter, agingFilter, search],
  );

  const totalOutstanding = allReceivables.reduce((s, r) => s + (r.outstanding ?? 0), 0);
  const agingTotals = AGING_BUCKETS.map((b) => ({
    bucket: b,
    total: allReceivables
      .filter((r) => r.aging === b)
      .reduce((s, r) => s + (r.outstanding ?? 0), 0),
  }));
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((r) => ({
        'Ref #': r.referenceNo,
        Customer: r.customerName,
        Type: r.type,
        'Issue Date': r.issueDate?.slice(0, 10),
        'Due Date': r.dueDate?.slice(0, 10),
        Amount: r.amount,
        Paid: r.amountPaid,
        Outstanding: r.outstanding,
        Aging: r.aging,
        Status: r.status,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Receivables');
    XLSX.writeFile(wb, `Receivables_${today}.xlsx`);
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
          <p className="text-red-700 font-medium">Failed to load receivables. Please retry.</p>
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
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Accounts Receivable</h3>
          <p className="text-muted-foreground">
            Customer balances, aging analysis, and payment tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={exportExcel} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Receivable
          </Button>
        </div>
      </div>

      {/* Aging Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Total Outstanding"
          value={formatCurrency(totalOutstanding)}
          subtitle="All receivables"
        />
        {AGING_BUCKETS.map((b) => (
          <StatCard
            key={b}
            title={b}
            value={formatCurrency(agingTotals.find((a) => a.bucket === b)?.total ?? 0)}
            subtitle={b === '90+ days' ? 'Critical' : ''}
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
            <BarChart2 className="h-4 w-4 text-blue-500" />
            AR Analytics
          </span>
          {chartsOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>
        {chartsOpen && (
          <div className="px-4 pb-4 space-y-4">
            {/* Aging bar */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                AR Aging Analysis
              </h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={agingTotals} barSize={44}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fontSize: 12 }}
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
                    contentStyle={{
                      borderRadius: '10px',
                      fontSize: '12px',
                      border: '1px solid #e2e8f0',
                    }}
                  />
                  <Bar dataKey="total" name="Outstanding" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Collection Rate Trend
                </h4>
                <SimpleLineChart
                  data={rcvCharts?.collectionRate ?? []}
                  xKey="month"
                  lines={[
                    { key: 'issued', color: '#3b82f6', label: 'Issued' },
                    { key: 'collected', color: '#10b981', label: 'Collected' },
                  ]}
                  height={220}
                />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">By Type</h4>
                <DonutChart data={rcvCharts?.byType ?? []} height={220} />
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Top 10 Customers by Amount
              </h4>
              <HorizontalBarChart
                data={rcvCharts?.topCustomers ?? []}
                height={240}
                color="#8b5cf6"
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
            placeholder="Search customer or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              {RECEIVABLE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </SelectItem>
              ))}
              <SelectItem value="RENT">RENT</SelectItem>
              <SelectItem value="LEASE">LEASE</SelectItem>
              <SelectItem value="SALE">SALE</SelectItem>
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
                Customer
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Ref #
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Type
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Issue Date
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Due Date
              </TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Total
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
                <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
                  No receivables found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} className="hover:bg-blue-50/50 transition-colors">
                  <TableCell className="pl-4 font-medium text-slate-800">
                    {r.customerName}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-blue-600 font-bold">
                    {r.referenceNo}
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {r.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.issueDate?.slice(0, 10)}
                  </TableCell>
                  <TableCell className="text-xs">
                    <span
                      className={
                        r.aging !== 'Current' ? 'text-red-600 font-medium' : 'text-muted-foreground'
                      }
                    >
                      {r.dueDate?.slice(0, 10) ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {formatCurrency(r.amount, r.currency)}
                  </TableCell>
                  <TableCell className="text-right text-emerald-600 font-medium text-sm">
                    {formatCurrency(r.amountPaid, r.currency)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-800">
                    {formatCurrency(r.outstanding ?? 0, r.currency)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${AGING_COLORS[r.aging] ?? ''}`}
                    >
                      {r.aging}
                    </span>
                  </TableCell>
                  <TableCell className="pr-4">
                    {!r.isInvoice && (r.outstanding ?? 0) > 0 && (
                      <button
                        onClick={() => setPayingFor(r as ManualReceivable)}
                        className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600"
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
        <AddReceivableModal
          accounts={accounts}
          branches={branches}
          onClose={() => setShowAdd(false)}
          onSaved={() => setShowAdd(false)}
        />
      )}
      {payingFor && (
        <PaymentModal
          receivable={payingFor}
          accounts={accounts}
          onClose={() => setPayingFor(null)}
        />
      )}
    </div>
  );
}
