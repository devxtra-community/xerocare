'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PaymentsTab from '@/components/Finance/PaymentsTab';
import ExpensesTab from '@/components/Finance/ExpensesTab';
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
  fetchManualPayables,
  createManualPayable,
  recordPayablePayment,
  fetchCashBankAccounts,
  fetchExpenseEntries,
  payExpenseEntry,
  fetchVendorStatement,
  fetchInputVatPayable,
  filterAccountsByPaymentMode,
  accountTypeForPaymentMode,
  insufficientBalanceError,
  type ManualPayable,
  type ExpenseEntry,
  type CashBankAccount,
} from '@/lib/finance/accountsApi';
import { DonutChart, HorizontalBarChart, SimpleBarChart } from '@/components/accounts/charts';
import {
  fetchPurchases,
  agingBucket,
  fetchBranches,
  type PurchaseOrder,
} from '@/lib/finance/accounts';
import { getUserFromToken } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import StatCard from '@/components/StatCard';
import BranchIdentityChip from '@/components/finance/BranchIdentityChip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PayableDetailModal } from '@/components/accounts/ReceivablePayableDetail';
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

const PAYABLE_STATUSES = ['PENDING', 'PARTIAL', 'UNPAID', 'PAID', 'OVERDUE', 'APPROVED'];
const PAYABLE_TYPES = [
  'VENDOR_INVOICE',
  'SALARY_PAYABLE',
  'RENT_PAYABLE',
  'UTILITY_PAYABLE',
  'EXPENSE_PAYABLE',
  'CUSTOMER_REFUND',
  'OTHER',
];
const today = new Date().toISOString().slice(0, 10);

function AddPayableModal({
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
    type: 'VENDOR_INVOICE',
    payableTo: '',
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
          <BranchIdentityChip branchId={currentUser?.branchId} role={currentUser?.role} />
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
  accounts: CashBankAccount[];
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    paymentDate: today,
    amount: payable.outstanding.toString(),
    paidFromAccount: '',
    paymentMode: 'Bank Transfer',
    referenceNo: '',
    chequeNumber: '',
    chequeBankName: '',
    chequeDueDate: '',
    notes: '',
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const isCheque = form.paymentMode === 'Cheque';
  const matchingAccounts = filterAccountsByPaymentMode(accounts, form.paymentMode);
  const selectedAccount = accounts.find((a) => a.id === form.paidFromAccount);
  const balanceError = isCheque
    ? null
    : insufficientBalanceError(parseFloat(form.amount) || 0, selectedAccount);

  // Default to (and re-default on mode change, dropping a now-invalid pick) the first
  // account matching the currently-selected mode rather than any account at all.
  useEffect(() => {
    if (isCheque) return;
    if (matchingAccounts.some((a) => a.id === form.paidFromAccount)) return;
    set('paidFromAccount', matchingAccounts[0]?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.paymentMode, accounts]);

  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () =>
      recordPayablePayment(payable.id, { ...form, amount: parseFloat(form.amount) }),
    onSuccess: () => {
      toast.success(
        isCheque
          ? 'Cheque recorded (PENDING). Go to Accounts → Cheques to clear when it clears the bank.'
          : 'Payment recorded',
      );
      qc.invalidateQueries({ queryKey: ['manual-payables'] });
      qc.invalidateQueries({ queryKey: ['cash-bank-accounts'] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to record payment';
      toast.error(msg);
    },
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
          {!isCheque && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Pay From Account</label>
              {matchingAccounts.length === 0 ? (
                <p className="text-xs font-medium text-red-600 mt-1">
                  No{' '}
                  {accountTypeForPaymentMode(form.paymentMode) === 'CASH' ? 'Cash in Hand' : 'Bank'}{' '}
                  account exists for this branch.
                </p>
              ) : (
                <Select
                  value={form.paidFromAccount}
                  onValueChange={(v) => set('paidFromAccount', v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {matchingAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} — {a.currency}{' '}
                        {Number(a.currentBalance).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {balanceError && (
                <p className="text-xs font-medium text-red-600 mt-1">{balanceError}</p>
              )}
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
                Cheque issued to vendor — bank balance updates when Finance clears it in Accounts →
                Cheques.
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
                    Name of the Bank *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Emirates NBD"
                    value={form.chequeBankName}
                    onChange={(e) => set('chequeBankName', e.target.value)}
                    className="mt-1"
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
          <Button
            onClick={() => mut.mutate()}
            disabled={
              mut.isPending ||
              !!balanceError ||
              (!isCheque && (matchingAccounts.length === 0 || !form.paidFromAccount))
            }
            className="flex-1"
          >
            {mut.isPending ? 'Saving...' : 'Record'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExpensePaymentModal({
  expense,
  accounts,
  onClose,
}: {
  expense: ExpenseEntry & { outstanding: number };
  accounts: CashBankAccount[];
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    paymentDate: today,
    paidFrom: '',
    paymentMode: 'Cash',
    referenceNo: '',
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const matchingAccounts = filterAccountsByPaymentMode(accounts, form.paymentMode);
  const selectedAccount = accounts.find((a) => a.id === form.paidFrom);
  const balanceError = insufficientBalanceError(Number(expense.outstanding), selectedAccount);

  useEffect(() => {
    if (matchingAccounts.some((a) => a.id === form.paidFrom)) return;
    set('paidFrom', matchingAccounts[0]?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.paymentMode, accounts]);

  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => payExpenseEntry(expense.id, form),
    onSuccess: () => {
      toast.success('Expense payment recorded — account balance updated');
      qc.invalidateQueries({ queryKey: ['approved-expenses-payable'] });
      qc.invalidateQueries({ queryKey: ['cash-bank-accounts'] });
      qc.invalidateQueries({ queryKey: ['expense-requests-fm'] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to record expense payment';
      toast.error(msg);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-slate-800">Pay Expense</h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="p-3 rounded-lg bg-amber-50 text-sm">
            <p className="font-medium text-slate-800">{expense.description}</p>
            <p className="text-muted-foreground text-xs">
              Amount: {formatCurrency(expense.outstanding, expense.currency)}
            </p>
            <p className="text-xs text-amber-700 font-mono">{expense.expenseNo}</p>
          </div>
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
            <label className="text-xs font-medium text-muted-foreground">Pay From Account</label>
            {matchingAccounts.length === 0 ? (
              <p className="text-xs font-medium text-red-600 mt-1">
                No{' '}
                {accountTypeForPaymentMode(form.paymentMode) === 'CASH' ? 'Cash in Hand' : 'Bank'}{' '}
                account exists for this branch.
              </p>
            ) : (
              <Select value={form.paidFrom} onValueChange={(v) => set('paidFrom', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {matchingAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} — {a.currency}{' '}
                      {Number(a.currentBalance).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {balanceError && (
              <p className="text-xs font-medium text-red-600 mt-1">{balanceError}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Payment Mode</label>
            <Select value={form.paymentMode} onValueChange={(v) => set('paymentMode', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['Cash', 'Bank Transfer', 'Card'].map((m) => (
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
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.paidFrom || !!balanceError}
            className="flex-1"
          >
            {mut.isPending ? 'Processing...' : 'Pay Now'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExpenseDetailModal({ expense, onClose }: { expense: ExpenseEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-bold text-slate-800">{expense.description}</h2>
            <p className="text-xs text-muted-foreground">
              {expense.expenseNo} · Accrued Expense (not yet paid)
            </p>
          </div>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Category</p>
            <p>{expense.category}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Date</p>
            <p>{expense.date?.slice(0, 10)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Status</p>
            <p>{expense.status}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Amount</p>
            <p className="font-semibold">
              {formatCurrency(expense.netAmount || expense.amount, expense.currency)}
            </p>
          </div>
          {expense.notes && (
            <div className="col-span-2">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Notes</p>
              <p>{expense.notes}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end px-6 pb-5">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function SelectVendorModal({
  vendors,
  onClose,
  onSelect,
}: {
  vendors: string[];
  onClose: () => void;
  onSelect: (vendorName: string) => void;
}) {
  const [chosen, setChosen] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-slate-800">Select Vendor</h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            A Vendor Statement of Account needs a specific vendor — choose who this statement is
            for.
          </p>
          <Select value={chosen} onValueChange={setChosen}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a vendor" />
            </SelectTrigger>
            <SelectContent>
              {vendors.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
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

export default function AccountsPayablePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get('tab') ?? 'payable') as 'payable' | 'payments' | 'expenses';

  const switchTab = (t: 'payable' | 'payments' | 'expenses') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', t);
    router.replace(`?${params.toString()}`);
  };

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
  const [payingFor, setPayingFor] = useState<ManualPayable | null>(null);
  const [payingForExpense, setPayingForExpense] = useState<
    (ExpenseEntry & { outstanding: number }) | null
  >(null);
  const [chartsOpen, setChartsOpen] = useState(true);
  const [viewingRow, setViewingRow] = useState<{ type: 'PO' | 'MANUAL'; id: string } | null>(null);
  const [viewingExpense, setViewingExpense] = useState<ExpenseEntry | null>(null);
  const [showVendorPicker, setShowVendorPicker] = useState(false);
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

  const { data: approvedExpenses = [] } = useQuery<ExpenseEntry[]>({
    queryKey: ['approved-expenses-payable'],
    queryFn: () => fetchExpenseEntries({ status: 'APPROVED' }),
    staleTime: 30_000,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['cash-bank-accounts'],
    queryFn: () => fetchCashBankAccounts(),
    staleTime: 60_000,
  });

  const { data: inputVatPayable } = useQuery({
    queryKey: ['input-vat-payable'],
    queryFn: () => fetchInputVatPayable(),
    staleTime: 30_000,
  });

  // Merge purchase orders + manual payables + approved expense entries + domestic
  // input VAT owed to vendors. Manual payables linked to a PO (linkedPurchaseId)
  // are excluded — that PO's own outstanding balance already covers it, so
  // including both would double-count.
  const allPayables = useMemo(() => {
    // Only include vendor purchases that still have an outstanding balance.
    // Fully-paid purchases have remainingAmount=0 and should not appear in AP.
    const fromPurchases = purchases
      .filter((p) => (p.remainingAmount ?? p.totalAmount ?? 0) > 0)
      .map((p) => ({
        id: p.id,
        referenceNo: `PO-${p.id?.slice(0, 8)}`,
        type: 'VENDOR_INVOICE',
        payableTo: p.vendor?.name ?? '',
        amount: p.totalAmount ?? 0,
        currency: p.currencyCode ?? currency,
        issueDate: p.createdAt,
        dueDate: p.createdAt,
        amountPaid: p.paidAmount ?? 0,
        outstanding: Number(p.remainingAmount ?? p.totalAmount ?? 0),
        status: p.status ?? 'PENDING',
        branchId: p.branchId,
        aging: p.createdAt ? agingBucket(p.createdAt) : 'Current',
        isPurchase: true,
        isExpense: false,
        isVat: false,
        source: 'Purchase Order' as const,
      }));
    const fromManual = manualPayables
      .filter((p) => !p.linkedPurchaseId)
      .map((p) => ({
        ...p,
        isPurchase: false,
        isExpense: false,
        isVat: false,
        source: 'Manual Entry' as const,
      }));
    // Domestic input VAT vendors charged us — no per-purchase breakdown is available
    // (the source endpoint returns one aggregate per currency), so this shows as a
    // single line rather than one row per purchase, and carries no Record Payment
    // action since there's no per-purchase VAT settlement to record against.
    const fromInputVat =
      inputVatPayable && inputVatPayable.amount > 0
        ? [
            {
              id: 'input-vat-payable',
              referenceNo: 'VAT-INPUT',
              type: 'OTHER' as const,
              payableTo: 'Vendors — Input VAT',
              amount: inputVatPayable.amount,
              currency: inputVatPayable.currency,
              issueDate: today,
              dueDate: today,
              amountPaid: 0,
              outstanding: inputVatPayable.amount,
              status: 'PENDING',
              branchId: currentUser?.branchId ?? '',
              aging: 'Current',
              isPurchase: false,
              isExpense: false,
              isVat: true,
              source: 'Input VAT' as const,
            },
          ]
        : [];
    const fromExpenses = approvedExpenses.map((e) => ({
      id: e.id,
      referenceNo: e.expenseNo,
      type: 'EXPENSE_PAYABLE',
      payableTo: e.description ?? e.category,
      amount: Number(e.netAmount || e.amount),
      currency: e.currency,
      issueDate: String(e.date),
      dueDate: String(e.date),
      amountPaid: 0,
      outstanding: Number(e.netAmount || e.amount),
      status: 'APPROVED',
      branchId: e.branchId,
      aging: e.date ? agingBucket(String(e.date)) : 'Current',
      isPurchase: false,
      isExpense: true,
      isVat: false,
      source: 'Accrued Expense' as const,
      _raw: e,
    }));
    return [...fromManual, ...fromExpenses, ...fromPurchases, ...fromInputVat];
  }, [
    purchases,
    manualPayables,
    approvedExpenses,
    inputVatPayable,
    currentUser?.branchId,
    currency,
  ]);

  const filtered = useMemo(
    () =>
      allPayables.filter((p) => {
        const matchType = typeFilter === 'ALL' || p.type === typeFilter;
        const matchAging = agingFilter === 'ALL' || p.aging === agingFilter;
        const matchSource = sourceFilter === 'ALL' || p.source === sourceFilter;
        const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
        const matchSearch =
          !search ||
          p.payableTo?.toLowerCase().includes(search.toLowerCase()) ||
          p.referenceNo?.toLowerCase().includes(search.toLowerCase());
        const matchAmountMin = !amountMin || (p.outstanding ?? 0) >= Number(amountMin);
        const matchAmountMax = !amountMax || (p.outstanding ?? 0) <= Number(amountMax);
        const matchDateFrom = !dateFrom || (p.issueDate?.slice(0, 10) ?? '') >= dateFrom;
        const matchDateTo = !dateTo || (p.issueDate?.slice(0, 10) ?? '') <= dateTo;
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
      allPayables,
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

  const totalPayable = allPayables.reduce((s, p) => s + Number(p.outstanding ?? 0), 0);
  // Subtotals mirroring the Chart of Accounts split: PO + non-linked Manual entries
  // reconcile with 2001 (Accounts Payable); Accrued Expense rows reconcile with 2002.
  const apSubtotal = allPayables
    .filter((p) => p.source !== 'Accrued Expense')
    .reduce((s, p) => s + Number(p.outstanding ?? 0), 0);
  const accruedSubtotal = allPayables
    .filter((p) => p.source === 'Accrued Expense')
    .reduce((s, p) => s + Number(p.outstanding ?? 0), 0);
  const agingTotals = AGING_BUCKETS.map((b) => ({
    bucket: b,
    total: allPayables
      .filter((p) => p.aging === b)
      .reduce((s, p) => s + Number(p.outstanding ?? 0), 0),
  }));

  const payCharts = useMemo(() => {
    const typeMap: Record<string, number> = {};
    allPayables.forEach((p) => {
      typeMap[p.type] = (typeMap[p.type] ?? 0) + (p.outstanding ?? 0);
    });
    const byType = Object.entries(typeMap)
      .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
      .sort((a, b) => b.value - a.value);

    const vendorMap: Record<string, number> = {};
    allPayables.forEach((p) => {
      if (!p.payableTo) return;
      vendorMap[p.payableTo] = (vendorMap[p.payableTo] ?? 0) + (p.outstanding ?? 0);
    });
    const topVendors = Object.entries(vendorMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Monthly payable: group total amount incurred per month (by issueDate / createdAt).
    // We show both the payable total (what was owed) and the paid amount (what was settled).
    // This way the chart always has data even when no payments have been recorded yet.
    const monthPayableMap: Record<string, { payable: number; paid: number }> = {};
    allPayables.forEach((p) => {
      const month = p.issueDate?.slice(0, 7) ?? '';
      if (!month) return;
      if (!monthPayableMap[month]) monthPayableMap[month] = { payable: 0, paid: 0 };
      monthPayableMap[month].payable += Number(p.amount) || 0;
      monthPayableMap[month].paid += Number(p.amountPaid) || 0;
    });
    const monthly = Object.entries(monthPayableMap)
      .map(([month, v]) => ({ month, payable: v.payable, paid: v.paid }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    return { byType, topVendors, monthly };
  }, [allPayables]);

  // Real vendors only — Accrued Expense rows are internal payees and the Input VAT
  // row is an aggregate across every vendor, not a single one, so both are excluded
  // from the Vendor Statement picker.
  const vendorNames = useMemo(
    () =>
      [
        ...new Set(
          allPayables
            .filter((p) => p.source !== 'Accrued Expense' && !p.isVat)
            .map((p) => p.payableTo),
        ),
      ]
        .filter(Boolean)
        .sort() as string[],
    [allPayables],
  );

  const generateVendorStatement = async (vendorName: string) => {
    setShowVendorPicker(false);
    setGeneratingStatement(true);
    try {
      const stmt = await fetchVendorStatement({
        vendorName,
        periodFrom: dateFrom || undefined,
        periodTo: dateTo || undefined,
      });
      setStatementData({
        kind: 'running-balance',
        title: 'Vendor Statement of Account',
        subjectName: stmt.vendorName,
        periodFrom: stmt.periodFrom,
        periodTo: stmt.periodTo,
        currency: stmt.currency,
        openingBalance: stmt.openingBalance,
        closingBalance: stmt.closingBalance,
        rows: stmt.rows,
        balanceLabel: 'Closing Balance (Amount We Owe)',
      });
    } catch {
      toast.error('Failed to generate statement');
    } finally {
      setGeneratingStatement(false);
    }
  };

  const handleGenerateStatementClick = () => {
    const uniqueVisible = [
      ...new Set(
        filtered.filter((p) => p.source !== 'Accrued Expense' && !p.isVat).map((p) => p.payableTo),
      ),
    ].filter(Boolean);
    if (uniqueVisible.length === 1) {
      generateVendorStatement(uniqueVisible[0] as string);
      return;
    }
    setShowVendorPicker(true);
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Accounts Payable</h3>
          <p className="text-muted-foreground">
            Vendor obligations, aging analysis, and payment management
          </p>
        </div>
        {/* Tab pills */}
        <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
          {(['payable', 'payments', 'expenses'] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                activeTab === t
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'payable' ? 'Payable' : t === 'payments' ? 'Payments' : 'Expenses'}
            </button>
          ))}
        </div>
      </div>

      {/* Payments tab */}
      {activeTab === 'payments' && <PaymentsTab />}

      {/* Expenses tab */}
      {activeTab === 'expenses' && <ExpensesTab />}

      {/* Payable tab content */}
      {activeTab === 'payable' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div />
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
                <Plus className="h-4 w-4" /> Add Payable
              </Button>
            </div>
          </div>
          <div className="space-y-6">
            {/* Aging Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard
                title="Total Payable"
                value={formatCurrency(totalPayable, currency)}
                subtitle="All payables"
              />
              <StatCard
                title="Accounts Payable"
                value={formatCurrency(apSubtotal, currency)}
                subtitle="PO + Manual — reconciles with CoA 2001"
              />
              <StatCard
                title="Accrued Expenses"
                value={formatCurrency(accruedSubtotal, currency)}
                subtitle="Approved expenses — reconciles with CoA 2002"
              />
              {AGING_BUCKETS.map((b) => (
                <StatCard
                  key={b}
                  title={b}
                  value={formatCurrency(
                    agingTotals.find((a) => a.bucket === b)?.total ?? 0,
                    currency,
                  )}
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
                          formatter={(v: number) => formatCurrency(v, currency)}
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
                    <DonutChart data={payCharts?.byType ?? []} height={200} currency={currency} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Top 5 Vendors
                    </h4>
                    <HorizontalBarChart
                      data={payCharts?.topVendors ?? []}
                      height={200}
                      color="#f59e0b"
                      currency={currency}
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Monthly Payments
                    </h4>
                    <SimpleBarChart
                      data={payCharts?.monthly ?? []}
                      xKey="month"
                      bars={[
                        { key: 'payable', color: '#f59e0b', label: 'Payable' },
                        { key: 'paid', color: '#10b981', label: 'Paid' },
                      ]}
                      height={200}
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
                    placeholder="Search payable to or reference..."
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
                      {PAYABLE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
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
                      <SelectItem value="Purchase Order">Purchase Order</SelectItem>
                      <SelectItem value="Manual Entry">Manual Entry</SelectItem>
                      <SelectItem value="Accrued Expense">Accrued Expense</SelectItem>
                      <SelectItem value="Input VAT">Input VAT</SelectItem>
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
                      {PAYABLE_STATUSES.map((s) => (
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
                      Payable To
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
                      <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
                        No payables found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((p) => (
                      <TableRow key={p.id} className="hover:bg-blue-50/50 transition-colors">
                        <TableCell className="pl-4 font-medium text-slate-800">
                          {p.payableTo}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-amber-600 font-bold">
                          {p.referenceNo}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                              p.source === 'Purchase Order'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : p.source === 'Manual Entry'
                                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                                  : p.source === 'Input VAT'
                                    ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                          >
                            {p.source}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            {p.type.replace(/_/g, ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span
                            className={
                              p.aging !== 'Current'
                                ? 'text-red-600 font-medium'
                                : 'text-muted-foreground'
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
                          <div className="flex items-center gap-1">
                            {p.isVat ? (
                              <span className="text-[10px] text-muted-foreground italic pl-1.5">
                                Aggregate — no per-purchase detail
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  if (p.isExpense) {
                                    const raw = (p as unknown as { _raw: ExpenseEntry })._raw;
                                    setViewingExpense(raw);
                                  } else {
                                    setViewingRow({
                                      type: p.isPurchase ? 'PO' : 'MANUAL',
                                      id: p.id,
                                    });
                                  }
                                }}
                                className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                                title="View full details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {!p.isPurchase && !p.isVat && (p.outstanding ?? 0) > 0 && (
                              <button
                                onClick={() => {
                                  if (p.isExpense) {
                                    const raw = (p as unknown as { _raw: ExpenseEntry })._raw;
                                    setPayingForExpense({
                                      ...raw,
                                      outstanding: p.outstanding ?? 0,
                                    });
                                  } else {
                                    setPayingFor(p as unknown as ManualPayable);
                                  }
                                }}
                                className="p-1.5 rounded-md hover:bg-amber-50 text-amber-600"
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
            <AddPayableModal
              accounts={accounts}
              onClose={() => setShowAdd(false)}
              onSaved={() => setShowAdd(false)}
            />
          )}
          {payingFor && (
            <PaymentModal
              payable={payingFor}
              accounts={accounts}
              onClose={() => setPayingFor(null)}
            />
          )}
          {payingForExpense && (
            <ExpensePaymentModal
              expense={payingForExpense}
              accounts={accounts}
              onClose={() => setPayingForExpense(null)}
            />
          )}
          {viewingRow && (
            <PayableDetailModal
              sourceType={viewingRow.type}
              id={viewingRow.id}
              onClose={() => setViewingRow(null)}
            />
          )}
          {viewingExpense && (
            <ExpenseDetailModal expense={viewingExpense} onClose={() => setViewingExpense(null)} />
          )}
          {showVendorPicker && (
            <SelectVendorModal
              vendors={vendorNames}
              onClose={() => setShowVendorPicker(false)}
              onSelect={generateVendorStatement}
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
        </>
      )}
    </div>
  );
}
