'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import EmployeeRequestsTab from '@/components/expenses/EmployeeRequestsTab';
import { getUserFromToken } from '@/lib/auth';
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
  Wallet,
  Eye,
  FileText,
} from 'lucide-react';
import {
  fetchExpenseEntries,
  createExpenseEntry,
  updateExpenseEntry,
  approveExpenseEntry,
  payExpenseEntry,
  deleteExpenseEntry,
  fetchCashBankAccounts,
  fetchExpenseCharts,
  type ExpenseEntry,
} from '@/lib/finance/accountsApi';
import { fetchPurchases, type PurchaseOrder } from '@/lib/finance/accounts';
import { StackedBarChart, SimpleBarChart } from '@/components/accounts/charts';
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
  'SHIPPING_HANDLING',
  'IMPORT_LABOUR',
  'CUSTOMS_DUTY',
  'MARKETING',
  'MAINTENANCE',
  'INSURANCE',
  'OTHER',
];

// IMPORT_LABOUR (5014, purchase-side import/customs-clearance labour) is kept visually and
// categorically distinct from LABOUR (5002, service-ticket Technician Labour) — same reason
// the account codes are split: blending them would misrepresent both numbers.
const CATEGORY_COLORS: Record<string, string> = {
  SALARY: '#6366f1',
  TRAVEL: '#f59e0b',
  RENT: '#3b82f6',
  UTILITIES: '#10b981',
  SPARE_PARTS: '#ef4444',
  LABOUR: '#8b5cf6',
  VENDOR_PURCHASE: '#ec4899',
  SHIPPING_HANDLING: '#0ea5e9',
  IMPORT_LABOUR: '#a855f7',
  CUSTOMS_DUTY: '#d97706',
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

function mapPurchaseCategory(cat: PurchaseOrder['purchaseCategory']): string {
  switch (cat) {
    case 'PRODUCT':
      return 'VENDOR_PURCHASE';
    case 'SPARE_PART':
      return 'SPARE_PARTS';
    case 'SERVICE':
      return 'LABOUR';
    default:
      return 'OTHER';
  }
}

interface ExpenseTableRow {
  id: string;
  source: 'Manual' | 'Purchase';
  isPurchase: boolean;
  date: string;
  expenseNo: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  taxAmount: number;
  taxLabel: string;
  taxPercent?: number | null;
  _entry?: ExpenseEntry;
  _purchase?: PurchaseOrder;
}
const thisMonthStart = `${today.slice(0, 7)}-01`;

function ExpenseModal({
  expense,
  accounts,
  onClose,
  onSaved,
}: {
  expense?: ExpenseEntry | null;
  accounts: { id: string; name: string; type: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const currentUser = getUserFromToken();
  const branchCurrency = useBranchCurrency();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    expenseNo: expense?.expenseNo ?? '',
    date: expense?.date?.slice(0, 10) ?? today,
    category: expense?.category ?? 'OTHER',
    subCategory: expense?.subCategory ?? '',
    description: expense?.description ?? '',
    amount: expense?.amount?.toString() ?? '',
    currency: expense?.currency ?? branchCurrency,
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
  useEffect(() => {
    if (branchCurrency) {
      setForm((f) => ({ ...f, currency: expense?.currency ?? branchCurrency }));
    }
  }, [branchCurrency, expense]);

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
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-600">Branch:</span>
                <span className="text-sm font-medium text-blue-800">
                  {currentUser?.branchId
                    ? `Branch ${currentUser.branchId.slice(0, 8)}…`
                    : 'Your Branch'}
                </span>
                <span className="text-xs text-blue-500 ml-auto">{currentUser?.role}</span>
              </div>
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
                  <div className="mt-1 px-3 py-2 rounded-md border border-border text-sm bg-muted/40 text-muted-foreground">
                    {form.currency || branchCurrency}
                  </div>
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
              disabled={step === 1 ? !form.description : step === 2 ? !form.amount : false}
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

function PayExpenseModal({
  expense,
  accounts,
  onClose,
  onPaid,
}: {
  expense: ExpenseEntry;
  accounts: { id: string; name: string; type: string }[];
  onClose: () => void;
  onPaid: () => void;
}) {
  const [paidFrom, setPaidFrom] = useState(expense.paidFrom ?? '');
  const [paymentMode, setPaymentMode] = useState(expense.paymentMode ?? PAYMENT_MODES[0]);
  const [paymentDate, setPaymentDate] = useState(today);
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBankName, setChequeBankName] = useState('');
  const [chequeDueDate, setChequeDueDate] = useState('');

  const isCheque = paymentMode === 'Cheque';

  const payMut = useMutation({
    mutationFn: () =>
      payExpenseEntry(expense.id, {
        paidFrom: paidFrom || undefined,
        paymentMode,
        paymentDate,
        chequeNumber: isCheque ? chequeNumber : undefined,
        chequeBankName: isCheque ? chequeBankName : undefined,
        chequeDueDate: isCheque ? chequeDueDate : undefined,
      }),
    onSuccess: () => {
      toast.success(
        isCheque
          ? 'Expense paid — PENDING cheque created. Go to Accounts → Cheques to issue when handed to vendor.'
          : 'Expense marked as paid',
      );
      onPaid();
    },
    onError: () => toast.error('Failed to mark as paid'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-bold text-slate-800">Mark Expense Paid</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-muted-foreground">
            {expense.expenseNo} · {expense.category.replace(/_/g, ' ')} ·{' '}
            <span className="font-semibold text-red-600">
              {formatCurrency(Number(expense.netAmount), expense.currency)}
            </span>
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Payment Mode</label>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger>
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
          {!isCheque && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">
                Paid From Account{' '}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Select value={paidFrom} onValueChange={setPaidFrom}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto (branch default by mode)" />
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
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Payment Date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          {isCheque && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
              <p className="text-xs font-bold text-amber-700">
                Cheque Details — creates a PENDING issued cheque. Cash at Bank decreases only when
                Finance marks it Cleared in Accounts → Cheques.
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Our Bank *</label>
                  <input
                    required
                    value={chequeBankName}
                    onChange={(e) => setChequeBankName(e.target.value)}
                    placeholder="e.g. Emirates NBD"
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={chequeDueDate}
                    onChange={(e) => setChequeDueDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  />
                </div>
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
            disabled={
              payMut.isPending || (isCheque && (!chequeNumber || !chequeBankName || !chequeDueDate))
            }
            onClick={() => payMut.mutate()}
          >
            {payMut.isPending ? 'Saving...' : 'Mark Paid'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Expense / Purchase Detail Modal (complete details + payment proof) ───────
function ProofSection({ url }: { url?: string | null }) {
  const isImage = !!url && /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url);
  if (!url) return <p className="text-sm text-slate-400">No proof uploaded.</p>;
  return (
    <div className="space-y-2">
      {isImage && (
        <img
          src={url}
          alt="Payment proof"
          className="w-full max-h-64 object-contain rounded-lg border bg-slate-50"
        />
      )}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
      >
        <FileText className="h-4 w-4" /> View Full Proof
      </a>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="text-muted-foreground whitespace-nowrap">{label}</dt>
      <dd className="font-medium text-slate-800 text-right break-words min-w-0">{value}</dd>
    </div>
  );
}

function ExpenseDetailModal({
  row,
  accounts,
  onClose,
}: {
  row: ExpenseTableRow;
  accounts: { id: string; name: string; type: string }[];
  onClose: () => void;
}) {
  const entry = row._entry;
  const po = row._purchase;

  // Full purchase (with payment transactions incl. proof attachments) for purchase rows
  const { data: fullPurchase, isLoading: loadingPurchase } = useQuery({
    queryKey: ['purchase-detail', po?.id],
    queryFn: async () => {
      const { purchaseService } = await import('@/services/purchaseService');
      return purchaseService.getPurchaseById(po!.id);
    },
    enabled: !!po?.id,
  });

  const origin = po?.purchaseOrigin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-slate-900">
            {row.isPurchase ? 'Purchase Expense Details' : 'Expense Details'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <dl className="space-y-2.5">
            <DetailRow
              label="Reference"
              value={<span className="font-mono">{row.expenseNo}</span>}
            />
            <DetailRow label="Date" value={row.date?.slice(0, 10) || '—'} />
            <DetailRow label="Category" value={row.category.replace(/_/g, ' ')} />
            <DetailRow label="Description" value={row.description || '—'} />
            {row.isPurchase && origin && (
              <DetailRow
                label="Purchase Type"
                value={
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${
                      origin === 'DOMESTIC'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {origin === 'DOMESTIC' ? 'LOCAL PURCHASE' : 'INTERNATIONAL PURCHASE'}
                  </span>
                }
              />
            )}
            {po?.vendor?.name && <DetailRow label="Vendor" value={po.vendor.name} />}
            <DetailRow label="Amount" value={formatCurrency(row.amount, row.currency)} />
            {row.taxAmount > 0 && (
              <DetailRow
                label={row.taxLabel || 'Tax'}
                value={formatCurrency(row.taxAmount, row.currency)}
              />
            )}
            {po && (
              <>
                <DetailRow
                  label="Paid"
                  value={formatCurrency(Number(po.paidAmount || 0), row.currency)}
                />
                <DetailRow
                  label="Remaining"
                  value={formatCurrency(
                    Number(
                      po.remainingAmount ?? Number(po.totalAmount) - Number(po.paidAmount || 0),
                    ),
                    row.currency,
                  )}
                />
              </>
            )}
            {entry && (
              <>
                {entry.subCategory && <DetailRow label="Sub-category" value={entry.subCategory} />}
                {entry.paymentMode && <DetailRow label="Payment Mode" value={entry.paymentMode} />}
                {entry.paidFrom && (
                  <DetailRow
                    label="Paid From"
                    value={accounts.find((a) => a.id === entry.paidFrom)?.name || entry.paidFrom}
                  />
                )}
                {entry.paymentDate && (
                  <DetailRow label="Payment Date" value={String(entry.paymentDate).slice(0, 10)} />
                )}
                {entry.referenceNo && <DetailRow label="Reference No" value={entry.referenceNo} />}
                {entry.notes && <DetailRow label="Notes" value={entry.notes} />}
              </>
            )}
            <DetailRow
              label="Status"
              value={
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${STATUS_BADGE[row.status] ?? ''}`}
                >
                  {row.status}
                </span>
              }
            />
          </dl>

          {/* Purchase payment transactions with per-payment proof */}
          {row.isPurchase && (
            <div className="border-t pt-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Payment Transactions
              </p>
              {loadingPurchase ? (
                <p className="text-sm text-slate-400">Loading payments…</p>
              ) : (fullPurchase?.payments?.length ?? 0) === 0 ? (
                <p className="text-sm text-slate-400">No payments recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {fullPurchase!.payments!.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-slate-50/60 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">
                          {formatCurrency(Number(p.amount), row.currency)}
                          <span className="ml-2 text-[10px] font-bold text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
                            {p.paymentMethod}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {String(p.paymentDate).slice(0, 10)}
                          {p.referenceNumber ? ` · ${p.referenceNumber}` : ''}
                        </p>
                      </div>
                      {p.attachmentUrl ? (
                        <a
                          href={p.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" /> Proof
                        </a>
                      ) : (
                        <span className="shrink-0 text-[10px] text-slate-400">No proof</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Manual expense proof */}
          {!row.isPurchase && (
            <div className="border-t pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Payment Proof / Receipt
              </p>
              <ProofSection url={entry?.receiptUrl} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExpenseManagementPage() {
  const currency = useBranchCurrency();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'expenses' | 'requests'>(
    searchParams?.get('tab') === 'requests' ? 'requests' : 'expenses',
  );
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState(thisMonthStart);
  const [toDate, setToDate] = useState(today);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ExpenseEntry | null>(null);
  const [paying, setPaying] = useState<ExpenseEntry | null>(null);
  const [viewing, setViewing] = useState<ExpenseTableRow | null>(null);
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

  const { data: purchases = [] } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchases-expenses'],
    queryFn: () => fetchPurchases(),
    staleTime: 60_000,
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

  const allRows = useMemo((): ExpenseTableRow[] => {
    const manual: ExpenseTableRow[] = expenses.map((e) => ({
      id: e.id,
      source: 'Manual',
      isPurchase: false,
      date: e.date,
      expenseNo: e.expenseNo,
      category: e.category,
      description: e.description,
      amount: Number(e.amount),
      currency: e.currency,
      status: e.status,
      taxAmount: Number(e.vatAmount) || 0,
      taxLabel: (Number(e.vatAmount) || 0) > 0 ? 'VAT' : '',
      _entry: e,
    }));
    const fromPurchases: ExpenseTableRow[] = purchases
      .filter((p) => {
        const d = (p.createdAt ?? '').slice(0, 10);
        return d >= fromDate && d <= toDate;
      })
      .flatMap((p) => {
        const isDomestic = p.purchaseOrigin === 'DOMESTIC';
        const isInternational = p.purchaseOrigin === 'INTERNATIONAL';

        // ── Tax amount resolution (priority order) ──────────────────────────
        // 1. Use stored computed VAT columns (most accurate — set at purchase creation)
        // 2. Fall back to taxPercent × taxableAmount if stored amounts are null
        // 3. Fall back to generic calculation from any available data
        let taxAmt = 0;
        let taxLabel = '';

        const storedInputVat = Number(p.inputVatAmount) || 0;
        const storedRcVat = Number(p.reverseChargeVatAmount) || 0;
        const taxPct = Number(p.taxPercent) || 0;
        const taxableBase = Number(p.taxableAmount) || 0;

        if (isDomestic) {
          taxAmt = storedInputVat || (taxPct && taxableBase ? taxableBase * (taxPct / 100) : 0);
          taxLabel = p.taxName || 'Input VAT';
        } else if (isInternational) {
          taxAmt = storedRcVat || (taxPct && taxableBase ? taxableBase * (taxPct / 100) : 0);
          taxLabel = p.taxName || 'RC VAT';
        } else {
          // purchaseOrigin not set — pick whichever stored amount is non-zero first,
          // then calculate from taxPercent/taxableAmount
          taxAmt =
            storedInputVat ||
            storedRcVat ||
            (taxPct && taxableBase ? taxableBase * (taxPct / 100) : 0);
          taxLabel = p.taxName || 'VAT';
        }

        const originLabel = isDomestic ? 'Domestic' : isInternational ? 'International' : '';
        const vendorName = p.vendor?.name ?? '';
        const catLabel = p.purchaseCategory?.replace(/_/g, ' ') ?? 'Purchase';
        // Use purchase's own currencyCode; fall back to branch currency (not hardcoded AED)
        const purchaseCurrency = p.currencyCode || currency;
        const date = p.createdAt?.slice(0, 10) ?? '';
        const status = p.status === 'PAID' ? 'PAID' : 'PENDING';
        const poShort = p.id?.slice(0, 8);
        const description = [catLabel, vendorName, originLabel].filter(Boolean).join(' · ');

        // Split each purchase into its constituent Chart-of-Accounts buckets so Finance
        // can see (and export) the cost breakdown per purchase, not just one opaque total.
        // The sum of these rows always equals p.totalAmount exactly (customsDuty is tracked
        // separately and was never part of totalAmount — see purchaseRepository.ts) — no
        // double-counting against the 5004/5005/5014/5015 totals shown elsewhere.
        // Full VAT/reverse-charge tax carried only on the anchor row so per-purchase totals
        // in the Tax column aren't inflated by summing across split rows.
        const vendorPurchaseCost = Number(p.purchaseAmount ?? 0) + Number(p.documentationFee ?? 0);
        const shippingHandling =
          Number(p.shippingCost ?? 0) +
          Number(p.handlingFee ?? 0) +
          Number(p.transportationCost ?? 0) +
          Number(p.groundfieldCost ?? 0);
        const importLabour = Number(p.labourCost ?? 0);
        const customsDutyAmt = Number(p.customsDuty ?? 0);

        const rows: ExpenseTableRow[] = [
          {
            id: `purchase-${p.id}-vendor`,
            source: 'Purchase' as const,
            isPurchase: true,
            date,
            expenseNo: `PO-${poShort}`,
            category: mapPurchaseCategory(p.purchaseCategory),
            description,
            amount: vendorPurchaseCost,
            currency: purchaseCurrency,
            status,
            taxAmount: taxAmt,
            taxLabel,
            taxPercent: p.taxPercent ?? null,
            _purchase: p,
          },
        ];
        if (shippingHandling > 0) {
          rows.push({
            id: `purchase-${p.id}-shipping`,
            source: 'Purchase' as const,
            isPurchase: true,
            date,
            expenseNo: `PO-${poShort}-SH`,
            category: 'SHIPPING_HANDLING',
            description: `Shipping & Handling · ${description}`,
            amount: shippingHandling,
            currency: purchaseCurrency,
            status,
            taxAmount: 0,
            taxLabel: '',
            taxPercent: null,
            _purchase: p,
          });
        }
        if (importLabour > 0) {
          rows.push({
            id: `purchase-${p.id}-labour`,
            source: 'Purchase' as const,
            isPurchase: true,
            date,
            expenseNo: `PO-${poShort}-LAB`,
            category: 'IMPORT_LABOUR',
            description: `Import / Purchase Labour · ${description}`,
            amount: importLabour,
            currency: purchaseCurrency,
            status,
            taxAmount: 0,
            taxLabel: '',
            taxPercent: null,
            _purchase: p,
          });
        }
        if (customsDutyAmt > 0) {
          rows.push({
            id: `purchase-${p.id}-duty`,
            source: 'Purchase' as const,
            isPurchase: true,
            date,
            expenseNo: `PO-${poShort}-DUTY`,
            category: 'CUSTOMS_DUTY',
            description: `Customs Duty · ${description}`,
            amount: customsDutyAmt,
            currency: purchaseCurrency,
            status,
            taxAmount: 0,
            taxLabel: '',
            taxPercent: null,
            _purchase: p,
          });
        }
        return rows;
      });
    return [...manual, ...fromPurchases];
  }, [expenses, purchases, fromDate, toDate, currency]);

  const filtered = useMemo(
    () =>
      allRows.filter((row) => {
        const matchCat = categoryFilter === 'ALL' || row.category === categoryFilter;
        const matchStatus = statusFilter === 'ALL' || row.status === statusFilter;
        const matchSearch =
          !search ||
          row.description?.toLowerCase().includes(search.toLowerCase()) ||
          row.expenseNo?.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchStatus && matchSearch;
      }),
    [allRows, categoryFilter, statusFilter, search],
  );

  const totalMonth = allRows.reduce((s, r) => s + r.amount, 0);
  const pendingCount = allRows.filter((r) => r.status === 'PENDING').length;
  const approvedTotal = allRows
    .filter((r) => r.status === 'APPROVED')
    .reduce((s, r) => s + r.amount, 0);

  const donutData = useMemo(() => {
    const map: Record<string, number> = {};
    allRows.forEach((r) => {
      map[r.category] = (map[r.category] ?? 0) + r.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [allRows]);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((row) => ({
        'Expense #': row.expenseNo,
        Source: row.source,
        Date: row.date?.slice(0, 10) ?? '',
        Category: row.category,
        Description: row.description,
        Amount: row.amount,
        'Tax Type': row.taxLabel || '—',
        'Tax Amount': row.taxAmount || '',
        Currency: row.currency,
        Status: row.status,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    XLSX.writeFile(wb, `Expenses_${fromDate}_${toDate}.xlsx`);
  };

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-card border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'expenses'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-slate-700'
          }`}
        >
          Expense Management
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-slate-700'
          }`}
        >
          Employee Requests
        </button>
      </div>

      {activeTab === 'requests' && <EmployeeRequestsTab />}

      {activeTab === 'expenses' && (
        <>
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {isError && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-8 text-center space-y-3 max-w-sm w-full mx-auto">
              <p className="text-red-700 font-medium">Failed to load expenses. Please retry.</p>
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
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
                    Expense Management
                  </h3>
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
                  value={formatCurrency(totalMonth, currency)}
                  subtitle="All categories"
                />
                <StatCard
                  title="Approved"
                  value={formatCurrency(approvedTotal, currency)}
                  subtitle="This period"
                />
                <StatCard
                  title="Pending Approval"
                  value={pendingCount.toString()}
                  subtitle="Awaiting review"
                />
                <StatCard
                  title="Entries"
                  value={expenses.length.toString()}
                  subtitle="Total records"
                />
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
                        currency={currency}
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
                              <Cell
                                key={entry.name}
                                fill={CATEGORY_COLORS[entry.name] ?? '#94a3b8'}
                              />
                            ))}
                          </Pie>
                          <Legend
                            layout="vertical"
                            align="right"
                            verticalAlign="middle"
                            formatter={(v) => (
                              <span className="text-xs">{v.replace(/_/g, ' ')}</span>
                            )}
                          />
                          <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
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
                        currency={currency}
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
                        currency={currency}
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
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Source
                      </TableHead>
                      <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Amount
                      </TableHead>
                      <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Tax
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
                        <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                          No expenses found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((row) => (
                        <TableRow key={row.id} className="hover:bg-blue-50/50 transition-colors">
                          <TableCell className="pl-4 font-mono text-xs text-muted-foreground">
                            {row.date?.slice(0, 10)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-blue-600 font-bold">
                            {row.expenseNo}
                          </TableCell>
                          <TableCell>
                            <span
                              className="px-2 py-0.5 rounded-md text-xs font-semibold"
                              style={{
                                background: `${CATEGORY_COLORS[row.category] ?? '#94a3b8'}20`,
                                color: CATEGORY_COLORS[row.category] ?? '#94a3b8',
                              }}
                            >
                              {row.category.replace(/_/g, ' ')}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                            {row.description}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                row.source === 'Purchase'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              {row.source}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-red-600">
                            {formatCurrency(row.amount, row.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.taxAmount > 0 ? (
                              <div className="flex flex-col items-end gap-0.5">
                                {row.taxLabel && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide ${
                                      row.taxLabel.toLowerCase().includes('input')
                                        ? 'bg-green-100 text-green-700'
                                        : row.taxLabel.toLowerCase().includes('rc') ||
                                            row.taxLabel.toLowerCase().includes('reverse')
                                          ? 'bg-orange-100 text-orange-700'
                                          : 'bg-blue-50 text-blue-600'
                                    }`}
                                  >
                                    {row.taxLabel}
                                    {row.taxPercent ? ` ${row.taxPercent}%` : ''}
                                  </span>
                                )}
                                <span className="text-xs font-semibold text-slate-700">
                                  {formatCurrency(row.taxAmount, row.currency)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${STATUS_BADGE[row.status] ?? ''}`}
                            >
                              {row.status}
                            </span>
                          </TableCell>
                          <TableCell className="pr-4">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setViewing(row)}
                                title="View details & payment proof"
                                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              {!row.isPurchase && row._entry && row.status === 'PENDING' && (
                                <button
                                  onClick={() => approveMut.mutate(row._entry!.id)}
                                  title="Approve"
                                  className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {!row.isPurchase &&
                                row._entry &&
                                row.status !== 'PAID' &&
                                row.status !== 'REJECTED' && (
                                  <button
                                    onClick={() => setPaying(row._entry!)}
                                    title="Mark Paid"
                                    className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                                  >
                                    <Wallet className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              {!row.isPurchase && row._entry && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditing(row._entry!);
                                      setShowModal(true);
                                    }}
                                    className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                                    title="Edit"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('Delete this expense?'))
                                        deleteMut.mutate(row._entry!.id);
                                    }}
                                    className="p-1.5 rounded-md hover:bg-red-50 text-red-500"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
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
                <ExpenseModal
                  expense={editing}
                  accounts={accounts}
                  onClose={() => setShowModal(false)}
                  onSaved={() => setShowModal(false)}
                />
              )}
              {paying && (
                <PayExpenseModal
                  expense={paying}
                  accounts={accounts}
                  onClose={() => setPaying(null)}
                  onPaid={() => {
                    setPaying(null);
                    qc.invalidateQueries({ queryKey: ['expense-entries'] });
                    qc.invalidateQueries({ queryKey: ['cash-bank-accounts'] });
                  }}
                />
              )}
              {viewing && (
                <ExpenseDetailModal
                  row={viewing}
                  accounts={accounts}
                  onClose={() => setViewing(null)}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
