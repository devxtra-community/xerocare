'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PaymentsTab from '@/components/Finance/PaymentsTab';
import ExpensesTab from '@/components/Finance/ExpensesTab';
import CreditNoteSettlementsTab from '@/components/finance/CreditNoteSettlementsTab';
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
import { useTablePagination } from '@/lib/hooks/useTablePagination';
import { getMyExpenseRequests, type ExpenseRequest } from '@/lib/employeeExpenses';
import Pagination from '@/components/Pagination';
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

const PAYABLE_STATUSES = [
  'PENDING',
  'PARTIAL',
  'UNPAID',
  'PAID',
  'OVERDUE',
  'APPROVED',
  'AWAITING APPROVAL',
];
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

/**
 * The short label for an expense row's "Payable To" column.
 *
 * That column names *who* is owed, not *why*. An expense description is free text — the
 * row that prompted this read "[Employee: RIYAS BRANCH MANAGER] manager took a flat for
 * his family and him" — which stretched the column far past every other row and pushed
 * the table into horizontal scroll.
 *
 * An employee claim is owed to the employee, so their name is the answer; anything else
 * falls back to the expense category. The full description is unchanged in the database
 * and still shown in the row's View modal, so nothing is lost — it just stops setting the
 * width of the whole table.
 */
function expensePayeeLabel(description?: string | null, category?: string | null): string {
  // approveExpenseRequest prefixes an employee claim's description with "[Employee: NAME]".
  const employee = /^\[Employee:\s*([^\]]+)\]/.exec(description ?? '');
  if (employee?.[1]) return employee[1].trim();
  return (category || 'Expense').replace(/_/g, ' ');
}

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
  const activeTab = (searchParams.get('tab') ?? 'payable') as
    | 'payable'
    | 'payments'
    | 'expenses'
    | 'credit-notes';

  const switchTab = (t: 'payable' | 'payments' | 'expenses' | 'credit-notes') => {
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

  // APPROVED *and* PAID. Fetching only APPROVED meant an expense disappeared from
  // Payables the moment it was settled — the same complaint that was fixed for purchases
  // and for tax rows. A paid expense stays on the table showing what it was and that it
  // is now closed.
  const { data: expenseEntries = [] } = useQuery<ExpenseEntry[]>({
    queryKey: ['expenses-payable'],
    queryFn: () => fetchExpenseEntries({ status: 'APPROVED,PAID' }),
    staleTime: 30_000,
  });

  // Employee expense claims still waiting on Accounts. These have no expense_entry yet —
  // one is only created on approval — so without this they were invisible on Payables
  // until somebody approved them, which is exactly when a claim most needs to be seen.
  const { data: employeeRequests = [] } = useQuery<ExpenseRequest[]>({
    queryKey: ['employee-expense-requests-payable'],
    queryFn: () => getMyExpenseRequests(),
    staleTime: 30_000,
  });
  const pendingEmployeeExpenses = useMemo(
    () =>
      employeeRequests.filter(
        (r) =>
          r.requestSource === 'EMPLOYEE_EXPENSE' &&
          (r.status === 'SUBMITTED' || r.status === 'PENDING'),
      ),
    [employeeRequests],
  );

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
    // Settled purchases stay on the list, exactly as a fully-paid invoice stays on
    // Receivables. Dropping them hid the payment history: the moment a vendor was paid
    // off, the row and everything you could learn from it — what was owed, when it was
    // settled — vanished from the only page that showed it.
    //
    // No total moves as a result: totalPayable, the AP/accrued subtotals, the aging
    // buckets and the type/vendor charts all sum `outstanding`, which is 0 on a settled
    // row. The monthly chart sums amount and amountPaid and is actively improved, since
    // a fully-settled month previously charted as empty.
    const fromPurchases = purchases.map((p) => ({
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
      isPendingApproval: false,
      source: 'Purchase Order' as const,
    }));
    const fromManual = manualPayables
      // A written-off balance is closed — a rejected Credit Note settlement, or a manual
      // write-off. It is excluded from AR/AP on the Balance Sheet, so showing it here
      // would put a dead row on a table of live obligations. The rejection itself stays
      // visible, with its reason, on the Credit Notes tab.
      .filter((p) => !p.linkedPurchaseId && p.status !== 'WRITTEN_OFF')
      .map((p) => ({
        ...p,
        isPurchase: false,
        isExpense: false,
        isVat: false,
        isPendingApproval: false,
        source: 'Manual Entry' as const,
      }));
    // Domestic input VAT vendors charged us.
    // One row per tax record, each linked back to the purchase it came from, so the
    // Proceed → approve → settle workflow has something concrete to act on and the row
    // can show a real Outstanding/Paid. This replaced a single aggregate line that
    // carried no link, no payment path and a hardcoded amountPaid of 0 — which is why it
    // sat permanently unpaid no matter what was settled.
    const fromInputVat = (inputVatPayable?.items ?? []).map((t) => ({
      id: `tax-${t.taxRecordId}`,
      referenceNo: t.requestNo ?? `VAT-${t.taxRecordId.slice(0, 8).toUpperCase()}`,
      type: 'TAX_PAYABLE',
      payableTo: `${t.taxName}${t.taxPercent != null ? ` ${Number(t.taxPercent)}%` : ''} — ${t.vendorName}`,
      amount: t.amount,
      currency: t.currency,
      issueDate: t.invoiceDate,
      dueDate: t.invoiceDate,
      // Paid is driven by the settlement, never by the vendor's own payment: the VAT
      // sits inside their invoice, so paying them says nothing about whether the tax has
      // been settled.
      amountPaid: t.settled ? t.amount : 0,
      outstanding: t.settled ? 0 : t.amount,
      status: t.settled ? 'PAID' : (t.requestStatus ?? 'PENDING'),
      branchId: currentUser?.branchId ?? '',
      aging: t.invoiceDate ? agingBucket(t.invoiceDate) : 'Current',
      isPurchase: false,
      isExpense: false,
      isVat: true,
      isPendingApproval: false,
      source: 'Input VAT' as const,
      taxRecordId: t.taxRecordId,
      requestStatus: t.requestStatus,
      settlementRef: t.settlementRef,
    }));
    const fromExpenses = expenseEntries.map((e) => {
      const gross = Number(e.netAmount || e.amount);
      const paid = e.status === 'PAID';
      return {
        id: e.id,
        referenceNo: e.expenseNo,
        type: 'EXPENSE_PAYABLE',
        payableTo: expensePayeeLabel(e.description, e.category),
        amount: gross,
        currency: e.currency,
        issueDate: String(e.date),
        dueDate: String(e.date),
        // A settled expense keeps its row and reads as fully paid, rather than dropping
        // off the table.
        amountPaid: paid ? gross : 0,
        outstanding: paid ? 0 : gross,
        status: paid ? 'PAID' : 'APPROVED',
        branchId: e.branchId,
        aging: e.date ? agingBucket(String(e.date)) : 'Current',
        isPurchase: false,
        isExpense: true,
        isVat: false,
        isPendingApproval: false,
        source: 'Accrued Expense' as const,
        _raw: e,
      };
    });
    // Claims awaiting Accounts. Shown as outstanding so the money the business is being
    // asked for is visible, but flagged so it stays OUT of the liability totals — an
    // unapproved claim is not yet an accepted obligation, and the Balance Sheet only
    // accrues expenses once they are APPROVED. Counting it here would put the page and
    // the Balance Sheet at odds.
    const fromPendingExpenses = pendingEmployeeExpenses.map((r) => ({
      id: `req-${r.id}`,
      referenceNo: r.requestNo,
      type: 'EXPENSE_PAYABLE',
      payableTo: r.employeeName || expensePayeeLabel(null, r.category),
      amount: Number(r.amount),
      currency: r.currency,
      issueDate: String(r.date),
      dueDate: String(r.date),
      amountPaid: 0,
      outstanding: Number(r.amount),
      status: 'AWAITING APPROVAL',
      branchId: r.branchId,
      aging: r.date ? agingBucket(String(r.date)) : 'Current',
      isPurchase: false,
      isExpense: true,
      isVat: false,
      isPendingApproval: true,
      source: 'Employee Claim' as const,
    }));
    return [
      ...fromManual,
      ...fromExpenses,
      ...fromPendingExpenses,
      ...fromPurchases,
      ...fromInputVat,
    ];
  }, [
    purchases,
    manualPayables,
    expenseEntries,
    pendingEmployeeExpenses,
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

  // Six rows a page. resetKey carries every filter so changing one returns the reader to
  // page 1 instead of stranding them past the end of a shorter result.
  const payablePaging = useTablePagination(
    filtered,
    `${typeFilter}|${agingFilter}|${sourceFilter}|${statusFilter}|${search}|${amountMin}|${amountMax}|${dateFrom}|${dateTo}`,
  );

  // ── The accounting guard ────────────────────────────────────────────────────
  // Tax rows are shown in this table for the workflow, but they are NOT a vendor
  // liability and must never be summed into one. A vendor invoice of 15,000 that
  // contains 714.29 of input VAT is a 15,000 liability — not 15,714.29. The VAT was
  // already paid to the vendor inside that invoice, and is reclaimable from the tax
  // authority (the Balance Sheet subtracts it from VAT Payable), so adding it here
  // would book the same money as owed twice.
  //
  // Employee claims awaiting Accounts are excluded for the same reason: the company has
  // not accepted the obligation yet, and accruedExpenses on the Balance Sheet only counts
  // expense entries once they are APPROVED. Summing an unapproved claim here would make
  // this page disagree with the Balance Sheet by the claim amount. It is reported on its
  // own card instead, so it is visible without being counted.
  const liabilityRows = allPayables.filter((p) => !p.isVat && !p.isPendingApproval);
  /** Employee claims submitted but not yet approved — visible, not yet a liability. */
  const awaitingApproval = allPayables
    .filter((p) => p.isPendingApproval)
    .reduce((s, p) => s + Number(p.outstanding ?? 0), 0);

  const totalPayable = liabilityRows.reduce((s, p) => s + Number(p.outstanding ?? 0), 0);
  // Subtotals mirroring the Chart of Accounts split: PO + non-linked Manual entries
  // reconcile with 2001 (Accounts Payable); Accrued Expense rows reconcile with 2002.
  const apSubtotal = liabilityRows
    .filter((p) => p.source !== 'Accrued Expense')
    .reduce((s, p) => s + Number(p.outstanding ?? 0), 0);
  const accruedSubtotal = liabilityRows
    .filter((p) => p.source === 'Accrued Expense')
    .reduce((s, p) => s + Number(p.outstanding ?? 0), 0);
  // Aging measures how overdue a debt is. A tax row is not a debt to anyone here, so it
  // stays out of the buckets as well — otherwise it would age as if a vendor were owed.
  const agingTotals = AGING_BUCKETS.map((b) => ({
    bucket: b,
    total: liabilityRows
      .filter((p) => p.aging === b)
      .reduce((s, p) => s + Number(p.outstanding ?? 0), 0),
  }));
  /** Outstanding tax, reported separately so it is visible without being a liability. */
  const taxOutstanding = allPayables
    .filter((p) => p.isVat)
    .reduce((s, p) => s + Number(p.outstanding ?? 0), 0);

  const payCharts = useMemo(() => {
    // Charts describe the vendor liability, so they read the same filtered set the
    // totals do — a tax row in "Top vendors" would name a tax as if it were a supplier
    // we owe money to.
    const chartRows = allPayables.filter((p) => !p.isVat && !p.isPendingApproval);
    const typeMap: Record<string, number> = {};
    chartRows.forEach((p) => {
      typeMap[p.type] = (typeMap[p.type] ?? 0) + (p.outstanding ?? 0);
    });
    const byType = Object.entries(typeMap)
      .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
      .sort((a, b) => b.value - a.value);

    const vendorMap: Record<string, number> = {};
    chartRows.forEach((p) => {
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
    chartRows.forEach((p) => {
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
          {(['payable', 'payments', 'expenses', 'credit-notes'] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                activeTab === t
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'payable'
                ? 'Payable'
                : t === 'payments'
                  ? 'Payments'
                  : t === 'expenses'
                    ? 'Expenses'
                    : 'Credit Notes'}
            </button>
          ))}
        </div>
      </div>

      {/* Payments tab */}
      {activeTab === 'payments' && <PaymentsTab />}

      {/* Expenses tab */}
      {activeTab === 'expenses' && <ExpensesTab />}

      {/* Credit Note settlements — the Accounts approval gate for customer refunds and
          exchange differences. Lives here because this page is where Accounts already
          performs money movement, and the queue spans both directions. */}
      {activeTab === 'credit-notes' && <CreditNoteSettlementsTab />}

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
              <StatCard
                title="Tax To Settle"
                value={formatCurrency(taxOutstanding, currency)}
                subtitle="Not a vendor liability — excluded from Total Payable"
              />
              <StatCard
                title="Awaiting Approval"
                value={formatCurrency(awaitingApproval, currency)}
                subtitle="Employee claims — not yet a liability"
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
                    <SimpleBarChart
                      data={agingTotals}
                      xKey="bucket"
                      bars={[{ key: 'total', color: '#f59e0b', label: 'Payable' }]}
                      height={200}
                      currency={currency}
                    />
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
                      <SelectItem value="Employee Claim">Employee Claim</SelectItem>
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
                    payablePaging.pageRows.map((p) => (
                      <TableRow key={p.id} className="hover:bg-blue-50/50 transition-colors">
                        {/* Capped and truncated so one unusually long payee name can
                            never set the width of the whole table again. `title` keeps
                            the full value reachable on hover. */}
                        <TableCell className="pl-4 font-medium text-slate-800">
                          <span
                            className="block max-w-56 truncate"
                            title={p.payableTo || undefined}
                          >
                            {p.payableTo}
                          </span>
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
                          {/* Only an unsettled row can be late. A paid one keeps its
                              date in plain text rather than the overdue red. */}
                          <span
                            className={
                              p.aging !== 'Current' && Number(p.outstanding ?? 0) > 0.001
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
                          {/* A settled row has no age — it is not waiting on anything.
                              Showing its original bucket read as though the money were
                              still owed and the vendor overdue. */}
                          {Number(p.outstanding ?? 0) <= 0.001 ? (
                            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              Paid
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${AGING_COLORS[p.aging] ?? ''}`}
                            >
                              {p.aging}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex items-center gap-1">
                            {p.isVat ? (
                              <span className="text-[10px] text-muted-foreground italic pl-1.5">
                                Settled from Tax
                              </span>
                            ) : p.isPendingApproval ? (
                              /* No expense entry exists until Accounts approves the claim,
                                 so there is nothing to open or to pay against yet. */
                              <span className="text-[10px] text-muted-foreground italic pl-1.5">
                                Awaiting Accounts approval
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
                            {!p.isPurchase &&
                              !p.isVat &&
                              !p.isPendingApproval &&
                              (p.outstanding ?? 0) > 0 && (
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
            {filtered.length > 0 && (
              <Pagination
                page={payablePaging.page}
                totalPages={payablePaging.totalPages}
                total={payablePaging.total}
                limit={payablePaging.pageSize}
                onPageChange={payablePaging.setPage}
              />
            )}
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
