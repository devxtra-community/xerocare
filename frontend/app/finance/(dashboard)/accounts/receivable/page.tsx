'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Plus,
  Search,
  Filter,
  X,
  CreditCard,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
} from 'lucide-react';
import {
  fetchManualReceivables,
  createManualReceivable,
  recordReceivablePayment,
  fetchCashBankAccounts,
  fetchReceivableCharts,
  fetchAccountsReceivableTransactions,
  fetchCustomerStatement,
  type ManualReceivable,
} from '@/lib/finance/accountsApi';
import { fetchBranches } from '@/lib/finance/accounts';
import { SimpleLineChart, DonutChart, HorizontalBarChart } from '@/components/accounts/charts';
import { getUserFromToken } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ReceivableDetailModal } from '@/components/accounts/ReceivablePayableDetail';
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
import StatementDialog, {
  type RunningBalanceStatementData,
} from '@/components/shared/StatementDialog';

const AGING_BUCKETS = ['Current', '1-30 days', '31-60 days', '61-90 days', '90+ days'];
const AGING_COLORS: Record<string, string> = {
  Current: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '1-30 days': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  '31-60 days': 'bg-orange-100 text-orange-700 border-orange-200',
  '61-90 days': 'bg-red-100 text-red-700 border-red-200',
  '90+ days': 'bg-red-200 text-red-800 border-red-300',
};

const RECEIVABLE_TYPES = ['CUSTOMER_INVOICE', 'SECURITY_DEPOSIT', 'ADVANCE_PAYMENT', 'OTHER'];
const RECEIVABLE_STATUSES = ['OUTSTANDING', 'PENDING', 'PARTIAL', 'OVERDUE', 'PAID', 'WRITTEN_OFF'];
const today = new Date().toISOString().slice(0, 10);

function AddReceivableModal({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accounts: _,
  onClose,
  onSaved,
}: {
  accounts: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const currentUser = getUserFromToken();
  const branchCurrency = useBranchCurrency();
  const [form, setForm] = useState({
    type: 'CUSTOMER_INVOICE',
    customerName: '',
    description: '',
    amount: '',
    currency: branchCurrency,
    issueDate: today,
    dueDate: today,
    notes: '',
  });
  useEffect(() => {
    setForm((f) => ({ ...f, currency: branchCurrency }));
  }, [branchCurrency]);
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
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-600">Branch:</span>
            <span className="text-sm font-medium text-blue-800">
              {currentUser?.branchId
                ? `Branch ${currentUser.branchId.slice(0, 8)}…`
                : 'Your Branch'}
            </span>
            <span className="text-xs text-blue-500 ml-auto">{currentUser?.role}</span>
          </div>
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
              <div className="mt-1 flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm font-medium text-foreground">
                {form.currency}
              </div>
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
    chequeNumber: '',
    chequeBankName: '',
    chequeDueDate: '',
    chequeDate: today,
    notes: '',
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const isCheque = form.paymentMode === 'Cheque';
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () =>
      recordReceivablePayment(receivable.id, { ...form, amount: parseFloat(form.amount) }),
    onSuccess: () => {
      toast.success(
        isCheque
          ? 'Cheque recorded (PENDING). Go to Accounts → Cheques to deposit when cleared.'
          : 'Payment recorded',
      );
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
          {!isCheque && (
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
          )}
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
          {isCheque ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-700">
                Cheque received — bank balance updates when Finance clears it in Accounts → Cheques.
              </p>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Cheque Number *</label>
                <Input
                  required
                  placeholder="e.g. CHQ-001234"
                  value={form.chequeNumber}
                  onChange={(e) => set('chequeNumber', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Customer Bank *
                  </label>
                  <Input
                    required
                    placeholder="e.g. HDFC Bank"
                    value={form.chequeBankName}
                    onChange={(e) => set('chequeBankName', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Cheque Date *</label>
                  <input
                    type="date"
                    required
                    value={form.chequeDate}
                    onChange={(e) => set('chequeDate', e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={form.chequeDueDate}
                    onChange={(e) => set('chequeDueDate', e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Reference #</label>
              <Input
                value={form.referenceNo}
                onChange={(e) => set('referenceNo', e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="flex-1">
            {mut.isPending ? 'Saving...' : isCheque ? 'Record Cheque' : 'Record'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SelectCustomerModal({
  customers,
  onClose,
  onSelect,
}: {
  customers: string[];
  onClose: () => void;
  onSelect: (customerName: string) => void;
}) {
  const [chosen, setChosen] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-slate-800">Select Customer</h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            A Customer Statement of Account needs a specific customer — choose who this statement is
            for.
          </p>
          <Select value={chosen} onValueChange={setChosen}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={() => chosen && onSelect(chosen)} disabled={!chosen} className="flex-1">
            Generate Statement
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AccountsReceivablePage() {
  const currency = useBranchCurrency();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [agingFilter, setAgingFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [payingFor, setPayingFor] = useState<ManualReceivable | null>(null);
  const [chartsOpen, setChartsOpen] = useState(true);
  const [viewingRow, setViewingRow] = useState<{ type: 'INVOICE' | 'MANUAL'; id: string } | null>(
    null,
  );
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [statementData, setStatementData] = useState<RunningBalanceStatementData | null>(null);
  const [generatingStatement, setGeneratingStatement] = useState(false);

  const currentUser = getUserFromToken();
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
    staleTime: 5 * 60 * 1000,
  });
  const activeBranch = useMemo(() => {
    if (!currentUser?.branchId) return branches[0];
    return branches.find((b) => b.id === currentUser.branchId) ?? branches[0];
  }, [branches, currentUser?.branchId]);
  const branchInfo = {
    name: activeBranch?.name ?? 'XeroCare',
    address: activeBranch?.address,
    tax_registration_number: activeBranch?.tax_registration_number,
    country: activeBranch?.country,
  };

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

  // Correctly-filtered invoice-based AR — same population that backs Chart of
  // Accounts 1003 (excludes DRAFT/CANCELLED/EXPIRED/RETAKEN/SUPERSEDED etc.),
  // unlike the raw invoice list which had no such filtering. includeSettled shows
  // the full AR history here (fully-paid invoices included, with real PAID status
  // and $0 outstanding) rather than just what's currently owed — the Total
  // Outstanding / aging stat cards below still sum only the outstanding side, so
  // that headline figure keeps its normal "what's currently owed" meaning.
  const { data: arInvoices = [] } = useQuery({
    queryKey: ['ar-invoice-transactions'],
    queryFn: () => fetchAccountsReceivableTransactions({ includeSettled: true }),
    staleTime: 60_000,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['cash-bank-accounts'],
    queryFn: () => fetchCashBankAccounts(),
    staleTime: 60_000,
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

  // Merge invoice AR + manual receivables into unified view. Manual receivables
  // linked to an invoice (linkedInvoiceId) are excluded here — that invoice's own
  // outstanding balance already covers it, so including both would double-count.
  const allReceivables = useMemo(() => {
    const fromInvoices = arInvoices.map((inv) => ({
      id: inv.id,
      referenceNo: inv.invoiceNumber,
      type: inv.saleType,
      customerName: inv.customerName,
      amount: inv.totalAmount,
      currency: inv.currencyCode,
      issueDate: inv.date,
      dueDate: null as string | null,
      amountPaid: inv.paid,
      outstanding: inv.amount,
      status: inv.status,
      branchId: inv.branchId,
      aging: inv.aging,
      isInvoice: true,
      source: (inv.isOpeningEntry ? 'Opening Balance' : 'Invoice') as 'Invoice' | 'Opening Balance',
    }));
    const fromManual = manualRcv
      .filter((r) => !r.linkedInvoiceId)
      .map((r) => ({ ...r, isInvoice: false, source: 'Manual Entry' as const }));
    return [...fromInvoices, ...fromManual];
  }, [arInvoices, manualRcv]);

  const filtered = useMemo(
    () =>
      allReceivables.filter((r) => {
        const matchType = typeFilter === 'ALL' || r.type === typeFilter;
        const matchAging = agingFilter === 'ALL' || r.aging === agingFilter;
        const matchSource = sourceFilter === 'ALL' || r.source === sourceFilter;
        const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
        const matchSearch =
          !search ||
          r.customerName?.toLowerCase().includes(search.toLowerCase()) ||
          r.referenceNo?.toLowerCase().includes(search.toLowerCase());
        const matchAmountMin = !amountMin || (r.outstanding ?? 0) >= Number(amountMin);
        const matchAmountMax = !amountMax || (r.outstanding ?? 0) <= Number(amountMax);
        const matchDateFrom = !dateFrom || (r.issueDate?.slice(0, 10) ?? '') >= dateFrom;
        const matchDateTo = !dateTo || (r.issueDate?.slice(0, 10) ?? '') <= dateTo;
        return (
          matchType &&
          matchAging &&
          matchSource &&
          matchStatus &&
          matchSearch &&
          matchAmountMin &&
          matchAmountMax &&
          matchDateFrom &&
          matchDateTo
        );
      }),
    [
      allReceivables,
      typeFilter,
      agingFilter,
      sourceFilter,
      statusFilter,
      search,
      amountMin,
      amountMax,
      dateFrom,
      dateTo,
    ],
  );

  const totalOutstanding = allReceivables.reduce((s, r) => s + (r.outstanding ?? 0), 0);
  const agingTotals = AGING_BUCKETS.map((b) => ({
    bucket: b,
    total: allReceivables
      .filter((r) => r.aging === b)
      .reduce((s, r) => s + (r.outstanding ?? 0), 0),
  }));
  const customerNames = useMemo(
    () =>
      [...new Set(allReceivables.map((r) => r.customerName).filter(Boolean))].sort() as string[],
    [allReceivables],
  );

  const generateCustomerStatement = async (customerName: string) => {
    setShowCustomerPicker(false);
    setGeneratingStatement(true);
    try {
      const stmt = await fetchCustomerStatement({
        customerName,
        periodFrom: dateFrom || undefined,
        periodTo: dateTo || undefined,
      });
      setStatementData({
        kind: 'running-balance',
        title: 'Customer Statement of Account',
        subjectName: stmt.customerName,
        periodFrom: stmt.periodFrom,
        periodTo: stmt.periodTo,
        currency: stmt.currency,
        openingBalance: stmt.openingBalance,
        closingBalance: stmt.closingBalance,
        rows: stmt.rows,
        balanceLabel: 'Closing Balance (Amount Owed)',
      });
    } catch {
      toast.error('Failed to generate statement');
    } finally {
      setGeneratingStatement(false);
    }
  };

  const handleGenerateStatementClick = () => {
    // A single customer already isolated by search/filter — generate directly
    // rather than making the user re-pick someone already unambiguous on screen.
    const uniqueVisible = [...new Set(filtered.map((r) => r.customerName).filter(Boolean))];
    if (uniqueVisible.length === 1) {
      generateCustomerStatement(uniqueVisible[0] as string);
      return;
    }
    setShowCustomerPicker(true);
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
          <Button
            onClick={handleGenerateStatementClick}
            variant="outline"
            className="gap-2"
            disabled={generatingStatement}
          >
            <FileText className="h-4 w-4" />
            {generatingStatement ? 'Generating…' : 'Generate Statement'}
          </Button>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Receivable
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Aging Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            title="Total Outstanding"
            value={formatCurrency(totalOutstanding, currency)}
            subtitle="All receivables"
          />
          {AGING_BUCKETS.map((b) => (
            <StatCard
              key={b}
              title={b}
              value={formatCurrency(agingTotals.find((a) => a.bucket === b)?.total ?? 0, currency)}
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
                      formatter={(v: number) => formatCurrency(v, currency)}
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
                    currency={currency}
                  />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">By Type</h4>
                  <DonutChart data={rcvCharts?.byType ?? []} height={220} currency={currency} />
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
                  currency={currency}
                />
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-card p-4 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10 bg-muted/50 border-none"
                placeholder="Search customer or reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
              <Filter className="h-3.5 w-3.5" /> Filters
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Type
              </label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full bg-card border-border">
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
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Aging
              </label>
              <Select value={agingFilter} onValueChange={setAgingFilter}>
                <SelectTrigger className="w-full bg-card border-border">
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
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Source
              </label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full bg-card border-border">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sources</SelectItem>
                  <SelectItem value="Invoice">Invoice</SelectItem>
                  <SelectItem value="Opening Balance">Opening Balance</SelectItem>
                  <SelectItem value="Manual Entry">Manual Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full bg-card border-border">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  {RECEIVABLE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Issue Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-border text-sm bg-card"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Issue Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-border text-sm bg-card"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Min Outstanding
              </label>
              <Input
                type="number"
                placeholder="0.00"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                className="w-full bg-card border-border"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Max Outstanding
              </label>
              <Input
                type="number"
                placeholder="Any"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                className="w-full bg-card border-border"
              />
            </div>
          </div>

          {(typeFilter !== 'ALL' ||
            agingFilter !== 'ALL' ||
            sourceFilter !== 'ALL' ||
            statusFilter !== 'ALL' ||
            search ||
            dateFrom ||
            dateTo ||
            amountMin ||
            amountMax) && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setSearch('');
                  setTypeFilter('ALL');
                  setAgingFilter('ALL');
                  setSourceFilter('ALL');
                  setStatusFilter('ALL');
                  setDateFrom('');
                  setDateTo('');
                  setAmountMin('');
                  setAmountMax('');
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
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
                  Source
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
                  <TableCell colSpan={11} className="text-center py-16 text-muted-foreground">
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
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          r.source === 'Invoice'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : r.source === 'Opening Balance'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {r.source}
                      </span>
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
                          r.aging !== 'Current'
                            ? 'text-red-600 font-medium'
                            : 'text-muted-foreground'
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
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            setViewingRow({ type: r.isInvoice ? 'INVOICE' : 'MANUAL', id: r.id })
                          }
                          className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                          title="View full details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {!r.isInvoice && (r.outstanding ?? 0) > 0 && (
                          <button
                            onClick={() => setPayingFor(r as ManualReceivable)}
                            className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600"
                            title="Record Payment"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {showAdd && (
        <AddReceivableModal
          accounts={accounts}
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
      {viewingRow && (
        <ReceivableDetailModal
          sourceType={viewingRow.type}
          id={viewingRow.id}
          onClose={() => setViewingRow(null)}
        />
      )}
      {showCustomerPicker && (
        <SelectCustomerModal
          customers={customerNames}
          onClose={() => setShowCustomerPicker(false)}
          onSelect={generateCustomerStatement}
        />
      )}
      {statementData && (
        <StatementDialog
          open
          onOpenChange={(o) => !o && setStatementData(null)}
          data={statementData}
          branch={branchInfo}
        />
      )}
    </div>
  );
}
