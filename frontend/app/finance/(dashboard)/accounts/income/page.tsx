'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserFromToken } from '@/lib/auth';
import { Plus, Search, Filter, CheckCircle, Trash2, Pencil, X, Wallet, Eye } from 'lucide-react';
import {
  fetchIncomeEntries,
  createIncomeEntry,
  updateIncomeEntry,
  approveIncomeEntry,
  receiveIncomeEntry,
  deleteIncomeEntry,
  fetchCashBankAccounts,
  fetchChartOfAccountsStructure,
  filterAccountsByPaymentMode,
  type IncomeEntry,
  type CashBankAccount,
} from '@/lib/finance/accountsApi';
import { IncomeEntryDetailModal } from '@/components/accounts/IncomeEntryDetailModal';
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

const RECEIVE_MODES = ['Cash', 'Bank Transfer', 'Cheque', 'Card'];

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  RECEIVED: 'bg-blue-100 text-blue-700 border-blue-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
};

const today = new Date().toISOString().slice(0, 10);
const thisMonthStart = `${today.slice(0, 7)}-01`;

function IncomeModal({
  entry,
  categories,
  onClose,
  onSaved,
}: {
  entry?: IncomeEntry | null;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const branchCurrency = useBranchCurrency();
  const [form, setForm] = useState({
    incomeNo: entry?.incomeNo ?? '',
    date: entry?.date?.slice(0, 10) ?? today,
    category: entry?.category ?? categories[0] ?? 'OTHER',
    subCategory: entry?.subCategory ?? '',
    description: entry?.description ?? '',
    amount: entry?.amount?.toString() ?? '',
    currency: entry?.currency ?? branchCurrency,
    vatAmount: entry?.vatAmount?.toString() ?? '0',
    netAmount: entry?.netAmount?.toString() ?? '',
    status: entry?.status ?? 'PENDING',
    notes: entry?.notes ?? '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleAmountChange = (val: string) => {
    const amount = parseFloat(val) || 0;
    const vat = parseFloat(form.vatAmount) || 0;
    set('amount', val);
    set('netAmount', (amount + vat).toFixed(2));
  };

  const qc = useQueryClient();
  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        vatAmount: parseFloat(form.vatAmount) || 0,
        netAmount: parseFloat(form.netAmount) || parseFloat(form.amount),
      };
      if (entry?.id) return updateIncomeEntry(entry.id, payload);
      return createIncomeEntry(payload);
    },
    onSuccess: () => {
      toast.success(entry ? 'Income entry updated' : 'Income entry created');
      qc.invalidateQueries({ queryKey: ['income-entries'] });
      onSaved();
    },
    onError: () => toast.error('Failed to save income entry'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-slate-800">{entry ? 'Edit Income' : 'Add Income'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Income #</label>
              <Input
                value={form.incomeNo}
                onChange={(e) => set('incomeNo', e.target.value)}
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
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              A category not yet linked to a Chart of Accounts income account rolls up into
              &quot;Other Income&quot; — add a dedicated account for it from Chart of Accounts → Add
              Account if you want it broken out separately.
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description *</label>
            <Input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="mt-1"
              placeholder="What is this income for?"
            />
          </div>
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
              <div className="mt-1 px-3 py-2 rounded-md border border-border text-sm bg-muted/40 text-muted-foreground">
                {form.currency || branchCurrency}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background resize-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={saveMut.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !form.description || !form.amount}
          >
            {saveMut.isPending ? 'Saving...' : entry ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReceiveIncomeModal({
  entry,
  accounts,
  onClose,
  onReceived,
}: {
  entry: IncomeEntry;
  accounts: CashBankAccount[];
  onClose: () => void;
  onReceived: () => void;
}) {
  const [receivedTo, setReceivedTo] = useState('');
  const [receivedMode, setReceivedMode] = useState(RECEIVE_MODES[0]);
  const [receivedDate, setReceivedDate] = useState(today);
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBankName, setChequeBankName] = useState('');

  const isCheque = receivedMode === 'Cheque';
  const matchingAccounts = filterAccountsByPaymentMode(accounts, receivedMode);

  useEffect(() => {
    if (isCheque) return;
    if (receivedTo === '' || matchingAccounts.some((a) => a.id === receivedTo)) return;
    setReceivedTo('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivedMode, accounts]);

  const receiveMut = useMutation({
    mutationFn: () =>
      receiveIncomeEntry(entry.id, {
        receivedTo: receivedTo || undefined,
        receivedMode,
        receivedDate,
        chequeNumber: isCheque ? chequeNumber : undefined,
        chequeBankName: isCheque ? chequeBankName : undefined,
      }),
    onSuccess: () => {
      toast.success(
        isCheque
          ? 'Income received — PENDING cheque created. Deposit and clear it from Accounts → Cheques.'
          : 'Income marked as received',
      );
      onReceived();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to mark as received';
      toast.error(msg);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-bold text-slate-800">Mark Income Received</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-muted-foreground">
            {entry.incomeNo} · {entry.category.replace(/_/g, ' ')} ·{' '}
            <span className="font-semibold text-emerald-600">
              {formatCurrency(Number(entry.netAmount), entry.currency)}
            </span>
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Received Via</label>
            <Select value={receivedMode} onValueChange={setReceivedMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECEIVE_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!isCheque && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">
                Deposit To <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Select value={receivedTo} onValueChange={setReceivedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto (branch default by mode)" />
                </SelectTrigger>
                <SelectContent>
                  {matchingAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.type}) — {a.currency}{' '}
                      {Number(a.currentBalance).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Received Date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
            />
          </div>
          {isCheque && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
              <p className="text-xs font-bold text-amber-700">
                Cheque Details — creates a PENDING received cheque. Cash at Bank increases only once
                Finance deposits and clears it in Accounts → Cheques.
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Cheque Number *</label>
                <input
                  required
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  placeholder="e.g. CHQ-001234"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Payer&apos;s Bank</label>
                <input
                  value={chequeBankName}
                  onChange={(e) => setChequeBankName(e.target.value)}
                  placeholder="e.g. Emirates NBD"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={receiveMut.isPending || (isCheque && !chequeNumber)}
            onClick={() => receiveMut.mutate()}
          >
            {receiveMut.isPending ? 'Saving...' : 'Mark Received'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function IncomeManagementPage() {
  const currency = useBranchCurrency();
  const currentUser = getUserFromToken();
  const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'FINANCE';
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState(thisMonthStart);
  const [toDate, setToDate] = useState(today);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<IncomeEntry | null>(null);
  const [receiving, setReceiving] = useState<IncomeEntry | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const qc = useQueryClient();

  const {
    data: entries = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<IncomeEntry[]>({
    queryKey: ['income-entries', fromDate, toDate],
    queryFn: () => fetchIncomeEntries({ fromDate, toDate }),
    staleTime: 30_000,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['cash-bank-accounts'],
    queryFn: () => fetchCashBankAccounts(),
    staleTime: 60_000,
  });

  const { data: structure = [] } = useQuery({
    queryKey: ['chart-of-accounts-structure'],
    queryFn: fetchChartOfAccountsStructure,
    staleTime: 60_000,
  });

  const categories = useMemo(() => {
    const linked = structure
      .filter((a) => a.sourceType === 'INCOME_CATEGORY_LINKED' && a.categoryKey)
      .map((a) => a.categoryKey as string);
    return [...new Set([...linked, 'OTHER'])];
  }, [structure]);

  const approveMut = useMutation({
    mutationFn: approveIncomeEntry,
    onSuccess: () => {
      toast.success('Income approved');
      qc.invalidateQueries({ queryKey: ['income-entries'] });
    },
    onError: () => toast.error('Failed to approve'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteIncomeEntry,
    onSuccess: () => {
      toast.success('Income entry deleted');
      qc.invalidateQueries({ queryKey: ['income-entries'] });
    },
    onError: () => toast.error('Failed to delete'),
  });

  const filtered = useMemo(
    () =>
      entries.filter((e) => {
        const matchCat = categoryFilter === 'ALL' || e.category === categoryFilter;
        const matchStatus = statusFilter === 'ALL' || e.status === statusFilter;
        const matchSearch =
          !search ||
          e.description?.toLowerCase().includes(search.toLowerCase()) ||
          e.incomeNo?.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchStatus && matchSearch;
      }),
    [entries, categoryFilter, statusFilter, search],
  );

  const totalPeriod = entries.reduce((s, e) => s + Number(e.netAmount), 0);
  const receivedTotal = entries
    .filter((e) => e.status === 'RECEIVED')
    .reduce((s, e) => s + Number(e.netAmount), 0);
  const pendingCount = entries.filter((e) => e.status === 'PENDING').length;

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {isError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-8 text-center space-y-3 max-w-sm w-full mx-auto">
          <p className="text-red-700 font-medium">Failed to load income entries. Please retry.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      )}
      {!isLoading && !isError && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
                Income Management
              </h3>
              <p className="text-muted-foreground">
                Track and receive real, non-invoice income — interest, refunds, misc. revenue
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
              {canManage && (
                <Button
                  onClick={() => {
                    setEditing(null);
                    setShowModal(true);
                  }}
                  className="gap-2 bg-primary text-primary-foreground"
                >
                  <Plus className="h-4 w-4" /> Add Income
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              title="This Period Total"
              value={formatCurrency(totalPeriod, currency)}
              subtitle="All categories"
            />
            <StatCard
              title="Received"
              value={formatCurrency(receivedTotal, currency)}
              subtitle="This period"
            />
            <StatCard
              title="Pending Approval"
              value={pendingCount.toString()}
              subtitle="Awaiting review"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 bg-card p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10 bg-muted/50 border-none"
                placeholder="Search description or income #..."
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
                  {categories.map((c) => (
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
                  <SelectItem value="RECEIVED">Received</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-slate-100 p-1">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="pl-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Date
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Income #
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
                      No income entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((e) => (
                    <TableRow key={e.id} className="hover:bg-blue-50/50 transition-colors">
                      <TableCell className="pl-4 font-mono text-xs text-muted-foreground">
                        {e.date?.slice(0, 10)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-blue-600 font-bold">
                        {e.incomeNo}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700">
                          {e.category.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {e.description}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        {formatCurrency(Number(e.netAmount), e.currency)}
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
                          <button
                            onClick={() => setViewingId(e.id)}
                            title="View full details"
                            className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {canManage && (
                            <>
                              {e.status === 'PENDING' && (
                                <button
                                  onClick={() => approveMut.mutate(e.id)}
                                  title="Approve"
                                  className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {e.status === 'APPROVED' && (
                                <button
                                  onClick={() => setReceiving(e)}
                                  title="Mark Received"
                                  className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                                >
                                  <Wallet className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {e.status !== 'RECEIVED' && (
                                <>
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
                                      if (confirm('Delete this income entry?'))
                                        deleteMut.mutate(e.id);
                                    }}
                                    className="p-1.5 rounded-md hover:bg-red-50 text-red-500"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {showModal && (
            <IncomeModal
              entry={editing}
              categories={categories}
              onClose={() => setShowModal(false)}
              onSaved={() => setShowModal(false)}
            />
          )}
          {receiving && (
            <ReceiveIncomeModal
              entry={receiving}
              accounts={accounts}
              onClose={() => setReceiving(null)}
              onReceived={() => {
                setReceiving(null);
                qc.invalidateQueries({ queryKey: ['income-entries'] });
                qc.invalidateQueries({ queryKey: ['cash-bank-accounts'] });
              }}
            />
          )}
          {viewingId && (
            <IncomeEntryDetailModal id={viewingId} onClose={() => setViewingId(null)} />
          )}
        </>
      )}
    </div>
  );
}
