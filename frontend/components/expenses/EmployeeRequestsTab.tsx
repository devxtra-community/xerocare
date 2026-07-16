'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, CheckCircle2, XCircle, X, FileText, Search } from 'lucide-react';
import {
  getMyExpenseRequests,
  getExpenseRequestSummary,
  approveExpenseRequest,
  rejectExpenseRequest,
  payExpenseRequest,
  type ExpenseRequest,
  type ExpenseRequestSummary,
} from '@/lib/employeeExpenses';
import { fetchCashBankAccounts } from '@/lib/finance/accountsApi';
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

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Draft', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  SUBMITTED: { label: 'Awaiting Approval', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  APPROVED: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200' },
  PAID: { label: 'Paid', color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

function getCategoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value.replace(/_/g, ' ');
}

// ─── View & Approve Modal ─────────────────────────────────────────────────────

function ViewApproveModal({
  expense,
  accounts,
  onClose,
}: {
  expense: ExpenseRequest;
  accounts: { id: string; name: string; type: string }[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'view' | 'approve' | 'reject'>('view');
  const [payNow, setPayNow] = useState(true);
  const [paidFromAccount, setPaidFromAccount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const isPurchaseRequest = expense.requestSource === 'MANAGER_PURCHASE';
  // Show the purchase-details box for any request tied to a purchase (including
  // auto-created records from direct Finance/Admin payments).
  const hasPurchaseInfo = isPurchaseRequest || !!expense.purchaseRef || !!expense.purchaseId;
  const isChequeMode = (expense.paymentMode ?? '').toLowerCase() === 'cheque';
  const isImageProof =
    !!expense.receiptUrl && /\.(png|jpe?g|gif|webp)(\?|$)/i.test(expense.receiptUrl);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['expense-requests-fm'] });
    qc.invalidateQueries({ queryKey: ['expense-requests-summary'] });
    qc.invalidateQueries({ queryKey: ['cash-bank-accounts'] });
    qc.invalidateQueries({ queryKey: ['purchases-ap'] });
  };

  const approveMut = useMutation({
    mutationFn: () =>
      isPurchaseRequest
        ? approveExpenseRequest(expense.id, {})
        : approveExpenseRequest(expense.id, {
            paid_from_account: payNow ? paidFromAccount : undefined,
            payment_reference: payNow ? paymentReference : undefined,
          }),
    onSuccess: () => {
      if (isPurchaseRequest) {
        toast.success(
          isChequeMode
            ? 'Purchase payment approved — cheque issued (pending clearance)'
            : 'Purchase payment approved — funds deducted from account',
        );
      } else {
        toast.success(payNow ? 'Expense approved and paid' : 'Expense approved');
      }
      invalidateAll();
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to approve';
      toast.error(msg);
    },
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectExpenseRequest(expense.id, rejectionReason),
    onSuccess: () => {
      toast.success(
        isPurchaseRequest
          ? 'Purchase payment rejected — outstanding balance restored'
          : 'Expense rejected',
      );
      invalidateAll();
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to reject';
      toast.error(msg);
    },
  });

  const isProcessing = approveMut.isPending || rejectMut.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-bold text-slate-800">
              {isPurchaseRequest ? 'Purchase Payment Request' : 'Expense Request'}
            </h2>
            <p className="text-xs text-muted-foreground">{expense.requestNo}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          {/* Requester info */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">{expense.employeeName}</p>
                <p className="text-xs text-muted-foreground">
                  {expense.employeeRole} · {expense.branchName}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${STATUS_CONFIG[expense.status]?.color}`}
              >
                {STATUS_CONFIG[expense.status]?.label}
              </span>
            </div>
          </div>

          {/* Purchase-specific details */}
          {hasPurchaseInfo && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                Purchase Payment Details
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {expense.vendorName && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Vendor</span>
                    <p className="font-semibold">{expense.vendorName}</p>
                  </div>
                )}
                {expense.purchaseRef && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Purchase Ref</span>
                    <p className="font-mono text-xs font-bold text-amber-700">
                      {expense.purchaseRef}
                    </p>
                  </div>
                )}
                {expense.purchaseOrigin && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Purchase Type</span>
                    <p>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${
                          expense.purchaseOrigin === 'DOMESTIC'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {expense.purchaseOrigin === 'DOMESTIC'
                          ? 'LOCAL PURCHASE'
                          : 'INTERNATIONAL PURCHASE'}
                      </span>
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Payment Mode</span>
                  <p className="font-medium">{expense.paymentMode || '—'}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Amount</span>
                  <p className="font-bold text-red-600">
                    {formatCurrency(Number(expense.amount), expense.currency)}
                  </p>
                </div>
                {!isChequeMode && expense.paidFromAccountId && (
                  <div className="col-span-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Pay From Account
                    </span>
                    <p className="text-sm font-medium">
                      {accounts.find((a) => a.id === expense.paidFromAccountId)?.name ||
                        expense.paidFromAccountId}
                    </p>
                  </div>
                )}
                {isChequeMode && expense.chequeNumber && (
                  <>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Cheque #</span>
                      <p className="font-mono text-xs">{expense.chequeNumber}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Bank</span>
                      <p className="text-sm">{expense.chequeBankName || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Due Date</span>
                      <p className="text-sm">{expense.chequeDueDate?.slice(0, 10) || '—'}</p>
                    </div>
                  </>
                )}
              </div>
              {isPurchaseRequest &&
                (isChequeMode ? (
                  <p className="text-xs text-amber-700">
                    Approving will create a PENDING ISSUED cheque. Cash at Bank moves when Finance
                    marks it Cleared in Accounts → Cheques.
                  </p>
                ) : (
                  <p className="text-xs text-amber-700">
                    Approving will immediately deduct funds from the Manager-selected account and
                    create a Cashbook entry.
                  </p>
                ))}
            </div>
          )}

          {/* Standard expense fields */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs font-medium text-muted-foreground">Date</span>
              <p className="font-medium">{expense.date?.slice(0, 10)}</p>
            </div>
            {!isPurchaseRequest && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Amount</span>
                <p className="font-bold text-red-600">
                  {formatCurrency(Number(expense.amount), expense.currency)}
                </p>
              </div>
            )}
            <div>
              <span className="text-xs font-medium text-muted-foreground">Category</span>
              <p className="font-medium">{getCategoryLabel(expense.category)}</p>
            </div>
            {expense.subCategory && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Sub-category</span>
                <p className="text-sm">{expense.subCategory}</p>
              </div>
            )}
            <div className="col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Description</span>
              <p className="text-slate-700">{expense.description}</p>
            </div>
            {expense.submittedAt && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Submitted</span>
                <p className="text-sm">{new Date(expense.submittedAt).toLocaleString()}</p>
              </div>
            )}
            <div className="col-span-2">
              <span className="text-xs font-medium text-muted-foreground">
                Payment Proof / Receipt
              </span>
              {expense.receiptUrl ? (
                <div className="mt-1 space-y-2">
                  {isImageProof && (
                    <img
                      src={expense.receiptUrl}
                      alt="Payment proof"
                      className="w-full max-h-64 object-contain rounded-lg border bg-slate-50"
                    />
                  )}
                  <a
                    href={expense.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-primary text-sm font-semibold hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    View Full Proof
                  </a>
                </div>
              ) : (
                <p className="text-sm text-slate-400 mt-1">No proof uploaded.</p>
              )}
            </div>
          </div>

          {/* Reject form */}
          {mode === 'reject' && (
            <div className="space-y-3 border border-red-200 rounded-xl p-4 bg-red-50">
              <p className="text-sm font-semibold text-red-700">Reason for Rejection *</p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-red-300 text-sm bg-white resize-none"
                placeholder={
                  isPurchaseRequest
                    ? 'Provide a clear reason. The purchase payment record will be reversed.'
                    : 'Please provide a clear reason so the employee can understand and resubmit if needed'
                }
              />
              {rejectionReason && rejectionReason.length < 20 && (
                <p className="text-xs text-red-600">Min 20 characters required</p>
              )}
            </div>
          )}

          {/* Approve form — only for EMPLOYEE_EXPENSE (MANAGER_PURCHASE uses stored payment info) */}
          {mode === 'approve' && !isPurchaseRequest && (
            <div className="space-y-3 border border-emerald-200 rounded-xl p-4 bg-emerald-50">
              <label className="flex items-center gap-2 text-sm font-medium text-emerald-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={payNow}
                  onChange={(e) => setPayNow(e.target.checked)}
                  className="rounded"
                />
                Pay immediately
              </label>
              {payNow && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Paid From Account *
                    </label>
                    <Select value={paidFromAccount} onValueChange={setPaidFromAccount}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select account..." />
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
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Payment Reference
                    </label>
                    <Input
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="mt-1"
                      placeholder="Cheque #, transfer ref..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0 gap-3">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            {mode === 'view' ? 'Close' : 'Cancel'}
          </Button>

          {mode === 'view' && expense.status === 'SUBMITTED' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setMode('reject')}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                onClick={() => setMode('approve')}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {isPurchaseRequest
                  ? isChequeMode
                    ? 'Approve & Issue Cheque'
                    : 'Approve & Pay'
                  : 'Approve'}
              </Button>
            </div>
          )}

          {mode === 'reject' && (
            <Button
              onClick={() => rejectMut.mutate()}
              disabled={rejectionReason.length < 20 || isProcessing}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {rejectMut.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          )}

          {mode === 'approve' && (
            <Button
              onClick={() => approveMut.mutate()}
              disabled={isProcessing || (!isPurchaseRequest && payNow && !paidFromAccount)}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {approveMut.isPending
                ? 'Approving...'
                : isPurchaseRequest
                  ? isChequeMode
                    ? 'Confirm — Issue Cheque'
                    : 'Confirm — Deduct Funds'
                  : 'Confirm Approval'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Pay Modal ────────────────────────────────────────────────────────────────

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Cheque', 'Card'];

function PayModal({
  expense,
  accounts,
  onClose,
}: {
  expense: ExpenseRequest;
  accounts: { id: string; name: string; type: string }[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [paidFromAccount, setPaidFromAccount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentReference, setPaymentReference] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBankName, setChequeBankName] = useState('');
  const [chequeDueDate, setChequeDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const isCheque = paymentMode === 'Cheque';

  const payMut = useMutation({
    mutationFn: () =>
      payExpenseRequest(expense.id, {
        paid_from_account: isCheque ? undefined : paidFromAccount,
        payment_reference: isCheque ? chequeNumber : paymentReference,
        payment_mode: paymentMode,
        cheque_number: isCheque ? chequeNumber : undefined,
        cheque_bank_name: isCheque ? chequeBankName : undefined,
        cheque_due_date: isCheque ? chequeDueDate : undefined,
        notes,
      }),
    onSuccess: () => {
      toast.success(
        isCheque
          ? 'Payment recorded — PENDING cheque created. Go to Accounts → Cheques to issue when handed to employee.'
          : `Payment recorded. ${expense.currency} ${Number(expense.amount).toFixed(2)} deducted`,
      );
      qc.invalidateQueries({ queryKey: ['expense-requests-fm'] });
      qc.invalidateQueries({ queryKey: ['expense-requests-summary'] });
      if (!isCheque) {
        qc.invalidateQueries({ queryKey: ['cash-bank-accounts'] });
        qc.invalidateQueries({ queryKey: ['approved-expenses-payable'] });
      }
      onClose();
    },
    onError: () => toast.error('Failed to record payment'),
  });

  const selectedAccount = accounts.find((a) => a.id === paidFromAccount);
  const canSubmit = isCheque
    ? !!(chequeNumber && chequeBankName && chequeDueDate)
    : !!paidFromAccount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-bold text-slate-800">Record Payment</h2>
            <p className="text-xs text-muted-foreground">{expense.employeeName}&rsquo;s Expense</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="bg-muted/40 rounded-xl p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{expense.requestNo}</span>
              <span className="font-bold text-red-600">
                {formatCurrency(Number(expense.amount), expense.currency)}
              </span>
            </div>
            <p className="text-muted-foreground mt-1">{getCategoryLabel(expense.category)}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Payment Mode *</label>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
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

          {!isCheque && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Paid From Account *
              </label>
              <Select value={paidFromAccount} onValueChange={setPaidFromAccount}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select account..." />
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

          <div>
            <label className="text-xs font-medium text-muted-foreground">Payment Date *</label>
            <input
              type="date"
              value={paymentDate}
              max={today}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background"
            />
          </div>

          {isCheque ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
              <p className="text-xs font-bold text-amber-700">
                Cheque details — creates a PENDING issued cheque. Cash at Bank decreases only when
                Finance marks it Cleared in Accounts → Cheques.
              </p>
              <div>
                <label className="text-xs font-semibold text-slate-600">Cheque Number *</label>
                <input
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  placeholder="e.g. CHQ-001234"
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Our Bank *</label>
                  <input
                    value={chequeBankName}
                    onChange={(e) => setChequeBankName(e.target.value)}
                    placeholder="e.g. Emirates NBD"
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Due Date *</label>
                  <input
                    type="date"
                    value={chequeDueDate}
                    onChange={(e) => setChequeDueDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Payment Reference</label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="mt-1"
                placeholder="Transfer ref, receipt #, etc."
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 pb-6 gap-3">
          <Button variant="outline" onClick={onClose} disabled={payMut.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => payMut.mutate()}
            disabled={!canSubmit || payMut.isPending}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            {payMut.isPending
              ? 'Recording...'
              : isCheque
                ? 'Record — Create Cheque'
                : `Record Payment${selectedAccount ? ` — ${selectedAccount.name}` : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmployeeRequestsTab() {
  const currency = useBranchCurrency();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<ExpenseRequest | null>(null);
  const [paying, setPaying] = useState<ExpenseRequest | null>(null);

  const { data: requests = [], isLoading } = useQuery<ExpenseRequest[]>({
    queryKey: ['expense-requests-fm', statusFilter],
    queryFn: () =>
      getMyExpenseRequests({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      }),
    staleTime: 30_000,
  });

  const { data: summary } = useQuery<ExpenseRequestSummary>({
    queryKey: ['expense-requests-summary'],
    queryFn: () => getExpenseRequestSummary(),
    staleTime: 60_000,
  });

  const { data: accountsRaw = [] } = useQuery({
    queryKey: ['cash-bank-accounts'],
    queryFn: () => fetchCashBankAccounts(),
    staleTime: 60_000,
  });
  const accounts = accountsRaw as { id: string; name: string; type: string }[];

  const filtered = useMemo(
    () =>
      requests.filter((r) => {
        if (!search) return true;
        return (
          r.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
          r.requestNo?.toLowerCase().includes(search.toLowerCase()) ||
          r.category?.toLowerCase().includes(search.toLowerCase()) ||
          r.description?.toLowerCase().includes(search.toLowerCase())
        );
      }),
    [requests, search],
  );

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            title="Pending Review"
            value={summary.submitted.count.toString()}
            subtitle={formatCurrency(summary.submitted.total_amount, currency)}
          />
          <StatCard
            title="Approved This Month"
            value={summary.approved.count.toString()}
            subtitle={formatCurrency(summary.approved.total_amount, currency)}
          />
          <StatCard
            title="Rejected"
            value={summary.rejected.count.toString()}
            subtitle={formatCurrency(summary.rejected.total_amount, currency)}
          />
          <StatCard
            title="Total Paid"
            value={summary.paid.count.toString()}
            subtitle={formatCurrency(summary.paid.total_amount, currency)}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10 bg-muted/50 border-none"
            placeholder="Search employee, request # or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PENDING">Draft</SelectItem>
            <SelectItem value="SUBMITTED">Awaiting Approval</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Submitted
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Request #
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Source
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Requester
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Category / Vendor
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground max-w-[180px]">
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
                  <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                    No requests found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PENDING;
                  const isPurchaseReq =
                    r.requestSource === 'MANAGER_PURCHASE' || !!r.purchaseRef || !!r.purchaseId;
                  return (
                    <TableRow key={r.id} className="hover:bg-blue-50/50 transition-colors">
                      <TableCell className="pl-4 font-mono text-xs text-muted-foreground">
                        {r.submittedAt
                          ? new Date(r.submittedAt).toLocaleDateString()
                          : r.date?.slice(0, 10)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-blue-600 font-bold">
                        {r.requestNo}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          {isPurchaseReq ? (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-amber-50 text-amber-700 border-amber-200 whitespace-nowrap">
                              Purchase
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">
                              Expense
                            </span>
                          )}
                          {r.purchaseOrigin && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide whitespace-nowrap ${
                                r.purchaseOrigin === 'DOMESTIC'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-indigo-100 text-indigo-700'
                              }`}
                            >
                              {r.purchaseOrigin === 'DOMESTIC' ? 'LOCAL' : 'INTERNATIONAL'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{r.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{r.employeeRole}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {isPurchaseReq ? (
                          <div>
                            <p className="font-semibold">{r.vendorName || 'Vendor'}</p>
                            {r.purchaseRef && (
                              <p className="text-muted-foreground font-mono text-[10px]">
                                {r.purchaseRef}
                              </p>
                            )}
                          </div>
                        ) : (
                          getCategoryLabel(r.category)
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px]">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{r.description}</span>
                          {r.receiptUrl && (
                            <a
                              href={r.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="View payment proof"
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0 text-blue-500 hover:text-blue-700"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        {formatCurrency(Number(r.amount), r.currency)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewing(r)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                            title="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {r.status === 'SUBMITTED' && (
                            <button
                              onClick={() => setViewing(r)}
                              className="px-2 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700"
                            >
                              Review
                            </button>
                          )}
                          {r.status === 'APPROVED' && !isPurchaseReq && (
                            <button
                              onClick={() => setPaying(r)}
                              className="px-2 py-1 rounded-md bg-purple-600 text-white text-[11px] font-semibold hover:bg-purple-700"
                            >
                              Pay
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
        )}
      </div>

      {viewing && (
        <ViewApproveModal expense={viewing} accounts={accounts} onClose={() => setViewing(null)} />
      )}

      {paying && <PayModal expense={paying} accounts={accounts} onClose={() => setPaying(null)} />}
    </div>
  );
}
