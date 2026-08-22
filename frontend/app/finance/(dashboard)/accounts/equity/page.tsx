'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  Scale,
  DollarSign,
  PieChart as PieIcon,
  BarChart2,
  CheckCircle,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import {
  fetchEquityEntries,
  createEquityEntry,
  updateEquityEntry,
  deleteEquityEntry,
  fetchEquitySummary,
  fetchEquityStatement,
  fetchBalanceSheet,
  fetchCashBankAccounts,
  filterAccountsByPaymentMode,
  insufficientBalanceError,
  CREATABLE_EQUITY_TYPES,
  type EquityEntry,
  type EquityType,
  type EquityReserveSource,
  type CashBankAccount,
} from '@/lib/finance/accountsApi';
import { fetchBranches } from '@/lib/finance/accounts';
import { getUserFromToken } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import StatementDialog, { type StatementData } from '@/components/shared/StatementDialog';
import StatCard from '@/components/StatCard';
import OwnerSelect from '@/components/finance/OwnerSelect';
import {
  DonutChart,
  SimpleLineChart,
  SimpleBarChart,
  WaterfallChart,
} from '@/components/accounts/charts';

import { getActiveCurrency } from '@/lib/currency';

// The 6 types actually offered on the create form (imported from accountsApi
// so the frontend list can't drift from what the backend will accept).
const EQUITY_TYPES: EquityType[] = CREATABLE_EQUITY_TYPES;

const PAYMENT_MODES = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT_CARD'];

const TYPE_LABELS: Record<string, string> = {
  SHARE_CAPITAL: 'Share Capital',
  RESERVES: 'Reserves',
  OWNER_CONTRIBUTION: 'Owner Contribution',
  DIVIDEND: 'Dividend',
  WITHDRAWAL: 'Withdrawal',
  OTHER: 'Other',
};

const TYPE_BADGE: Record<string, string> = {
  SHARE_CAPITAL: 'bg-blue-100 text-blue-700',
  RETAINED_EARNINGS: 'bg-emerald-100 text-emerald-700',
  RESERVES: 'bg-purple-100 text-purple-700',
  OWNER_CONTRIBUTION: 'bg-amber-100 text-amber-700',
  DIVIDEND: 'bg-red-100 text-red-700',
  WITHDRAWAL: 'bg-rose-100 text-rose-700',
  PROFIT_TRANSFER: 'bg-cyan-100 text-cyan-700',
  LOSS_TRANSFER: 'bg-orange-100 text-orange-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

// ─── Equity Entry Modal ───────────────────────────────────────────────────────

interface ModalProps {
  entry?: EquityEntry | null;
  cashAccounts: CashBankAccount[];
  onClose: () => void;
  onSave: (data: Partial<EquityEntry>) => void;
  saving: boolean;
}

// Which of the type-specific fields apply to a given type — drives both which
// fields render and which of them get cleared (sent as null) on save, so
// switching an entry's type never leaves stale hidden values behind.
const OWNER_TRACKED_TYPES: EquityType[] = [
  'SHARE_CAPITAL',
  'OWNER_CONTRIBUTION',
  'DIVIDEND',
  'WITHDRAWAL',
];
const PAYMENT_MODE_TYPES = OWNER_TRACKED_TYPES;

function EquityModal({ entry, cashAccounts, onClose, onSave, saving }: ModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const branchCurrency = useBranchCurrency();
  const [form, setForm] = useState({
    date: entry?.date?.slice(0, 10) ?? today,
    type: (entry?.type ?? 'SHARE_CAPITAL') as EquityType,
    description: entry?.description ?? '',
    amount: entry?.amount ? String(entry.amount) : '',
    currency: entry?.currency ?? getActiveCurrency(),
    referenceNo: entry?.referenceNo ?? '',
    linkedCashAccountId: entry?.linkedCashAccountId ?? '',
    notes: entry?.notes ?? '',
    // Type-specific
    ownerId: entry?.ownerId ?? '',
    paymentMode: entry?.paymentMode ?? 'CASH',
    numberOfShares: entry?.numberOfShares ? String(entry.numberOfShares) : '',
    pricePerShare: entry?.pricePerShare ? String(entry.pricePerShare) : '',
    reserveType: entry?.reserveType ?? '',
    reserveSource: (entry?.reserveSource ?? 'DIRECT_ENTRY') as EquityReserveSource,
    paymentDate: entry?.paymentDate?.slice(0, 10) ?? '',
    documentUrl: entry?.documentUrl ?? '',
    // Cheque-mode-only — not stored on the entry itself, only used to create the
    // PENDING cheque record (mirrors the Cheque details block on invoice/purchase
    // payment forms elsewhere in this app).
    chequeNumber: '',
    chequeBankName: '',
    chequeDate: today,
    chequeDueDate: '',
  });
  // Every equity movement must have a documented double-entry counterpart. Linking a cash
  // account is the common case; this confirms non-cash entries (e.g. a non-cash capital
  // contribution, or a paper transfer between equity types) are a deliberate choice rather
  // than someone simply skipping the field.
  const [confirmNonCash, setConfirmNonCash] = useState(
    !!entry?.linkedCashAccountId === false && !!entry,
  );
  useEffect(() => {
    if (!entry) {
      setForm((f) => ({ ...f, currency: branchCurrency }));
    }
  }, [branchCurrency, entry]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const showOwner = OWNER_TRACKED_TYPES.includes(form.type);
  const showPaymentMode = PAYMENT_MODE_TYPES.includes(form.type);
  const isShareCapital = form.type === 'SHARE_CAPITAL';
  const isReserves = form.type === 'RESERVES';
  const isDividend = form.type === 'DIVIDEND';
  const isWithdrawal = form.type === 'WITHDRAWAL';
  // A cheque's bank account isn't chosen yet — that happens later at Deposit/Issue
  // in Accounts → Cheques — so this type/mode combination skips the linked-account
  // picker entirely in favor of the cheque-detail fields below.
  const isCheque = showPaymentMode && form.paymentMode === 'CHEQUE';
  // Only types with a visible Payment Mode selector (Share Capital / Owner
  // Contribution / Dividend / Withdrawal) get their account list narrowed by it —
  // Reserves/Other have no mode field at all, so there's nothing to mismatch and the
  // full list stays available exactly as before.
  const matchingAccounts = showPaymentMode
    ? filterAccountsByPaymentMode(cashAccounts, form.paymentMode)
    : cashAccounts;
  const selectedCashAccount = cashAccounts.find((a) => a.id === form.linkedCashAccountId);
  const balanceError =
    isDividend || isWithdrawal
      ? insufficientBalanceError(parseFloat(form.amount) || 0, selectedCashAccount)
      : null;

  useEffect(() => {
    if (!showPaymentMode) return;
    if (
      form.linkedCashAccountId === '' ||
      matchingAccounts.some((a) => a.id === form.linkedCashAccountId)
    )
      return;
    set('linkedCashAccountId', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.paymentMode, cashAccounts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount || !form.date) {
      toast.error('Date, description and amount are required');
      return;
    }
    if (showOwner && !form.ownerId) {
      toast.error(`Select an owner/shareholder for a ${TYPE_LABELS[form.type]} entry`);
      return;
    }
    if (isCheque) {
      if (!form.chequeNumber || !form.chequeBankName || !form.chequeDate || !form.chequeDueDate) {
        toast.error('Cheque number, bank name, cheque date and due date are all required');
        return;
      }
    } else if (balanceError) {
      toast.error(balanceError);
      return;
    } else if (!form.linkedCashAccountId && !confirmNonCash) {
      toast.error(
        'Confirm this entry has no cash/bank movement, or link a Cash/Bank Account above',
      );
      return;
    }

    // Build the payload from a clean slate rather than spreading `form` — a
    // field left over from switching types (e.g. numberOfShares after
    // switching SHARE_CAPITAL → OTHER) must be explicitly nulled on save,
    // not just omitted, so an update actually clears the stale value.
    const payload: Record<string, unknown> = {
      date: form.date,
      type: form.type,
      description: form.description,
      amount: parseFloat(form.amount),
      currency: form.currency,
      referenceNo: form.referenceNo || null,
      linkedCashAccountId: isCheque ? null : form.linkedCashAccountId || null,
      notes: form.notes || null,
      ownerId: showOwner ? form.ownerId : null,
      paymentMode: showPaymentMode ? form.paymentMode : null,
      numberOfShares: isShareCapital && form.numberOfShares ? Number(form.numberOfShares) : null,
      pricePerShare: isShareCapital && form.pricePerShare ? Number(form.pricePerShare) : null,
      documentUrl: isShareCapital ? form.documentUrl || null : null,
      reserveType: isReserves ? form.reserveType || null : null,
      reserveSource: isReserves ? form.reserveSource : null,
      paymentDate: isDividend ? form.paymentDate || null : null,
      ...(isCheque
        ? {
            chequeNumber: form.chequeNumber,
            chequeBankName: form.chequeBankName,
            chequeDate: form.chequeDate,
            chequeDueDate: form.chequeDueDate,
          }
        : {}),
    };
    onSave(payload as Partial<EquityEntry>);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-gray-900">
            {entry ? 'Edit Equity Entry' : 'New Equity Entry'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {isDividend ? 'Declaration Date' : 'Date'}
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {EQUITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t] ?? t.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dividend — Payment Date, separate from the Declaration Date above */}
          {isDividend && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Payment Date{' '}
                <span className="text-gray-400 font-normal">(leave blank if not yet paid)</span>
              </label>
              <input
                type="date"
                value={form.paymentDate}
                onChange={(e) => set('paymentDate', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Owner — Share Capital / Owner Contribution / Dividend / Withdrawal */}
          {showOwner && (
            <OwnerSelect
              value={form.ownerId}
              onChange={(id) => set('ownerId', id)}
              label={isDividend ? 'Recipient Owner' : 'Owner / Shareholder'}
              required
            />
          )}

          {/* Share Capital — shares issued */}
          {isShareCapital && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Number of Shares
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.numberOfShares}
                  onChange={(e) => set('numberOfShares', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Price per Share
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={form.pricePerShare}
                  onChange={(e) => set('pricePerShare', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Reserves — reserve type + source */}
          {isReserves && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reserve Type</label>
                <input
                  value={form.reserveType}
                  onChange={(e) => set('reserveType', e.target.value)}
                  placeholder="e.g. General Reserve"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
                <select
                  value={form.reserveSource}
                  onChange={(e) => set('reserveSource', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DIRECT_ENTRY">Direct Entry</option>
                  <option value="FROM_RETAINED_EARNINGS">From Retained Earnings</option>
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
              <div className="w-full border rounded-lg px-3 py-2 text-sm bg-muted font-medium">
                {form.currency}
              </div>
            </div>
          </div>

          {/* Payment Mode — Share Capital / Owner Contribution / Dividend / Withdrawal */}
          {showPaymentMode && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Mode</label>
              <select
                value={form.paymentMode}
                onChange={(e) => set('paymentMode', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cheque details — mirrors the Cheque block on invoice/purchase payment forms.
              No cash movement happens now; a PENDING cheque is created instead, and Cash
              at Bank only moves once it's cleared in Accounts → Cheques. */}
          {isCheque && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="col-span-full text-xs font-medium text-amber-700">
                This creates a PENDING {isDividend || isWithdrawal ? 'Issued' : 'Received'} cheque
                record. Cash at Bank only moves once it&apos;s cleared in Accounts → Cheques.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Cheque Number
                </label>
                <input
                  value={form.chequeNumber}
                  onChange={(e) => set('chequeNumber', e.target.value)}
                  placeholder="e.g. CHQ-001234"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label>
                <input
                  value={form.chequeBankName}
                  onChange={(e) => set('chequeBankName', e.target.value)}
                  placeholder="e.g. Emirates NBD"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Cheque Date <span className="text-gray-400 font-normal">(date on cheque)</span>
                </label>
                <input
                  type="date"
                  value={form.chequeDate}
                  onChange={(e) => set('chequeDate', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Cheque Due Date
                </label>
                <input
                  type="date"
                  value={form.chequeDueDate}
                  onChange={(e) => set('chequeDueDate', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reference No.</label>
            <input
              value={form.referenceNo}
              onChange={(e) => set('referenceNo', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Share Capital — optional document reference (e.g. share certificate link) */}
          {isShareCapital && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Document Reference{' '}
                <span className="text-gray-400 font-normal">(e.g. certificate link, optional)</span>
              </label>
              <input
                value={form.documentUrl}
                onChange={(e) => set('documentUrl', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {!isCheque && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Linked Cash/Bank Account (auto-creates cashbook entry)
              </label>
              <select
                value={form.linkedCashAccountId}
                onChange={(e) => {
                  set('linkedCashAccountId', e.target.value);
                  if (e.target.value) setConfirmNonCash(false);
                }}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— none —</option>
                {matchingAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.currency}{' '}
                    {Number(a.currentBalance).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </option>
                ))}
              </select>
              {balanceError && (
                <p className="mt-1 text-xs font-medium text-red-600">{balanceError}</p>
              )}
              {!form.linkedCashAccountId && (
                <label className="mt-2 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <input
                    type="checkbox"
                    checked={confirmNonCash}
                    onChange={(e) => setConfirmNonCash(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    This entry does not involve any cash/bank account movement (e.g. a non-cash
                    contribution, or a transfer between equity types) — confirm this is intentional.
                    No cashbook entry will be created.
                  </span>
                </label>
              )}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {isWithdrawal ? 'Reason' : 'Notes'}
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !!balanceError}
              className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EquityPage() {
  const currency = useBranchCurrency();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'entries' | 'statement' | 'balance'>('overview');
  const [modal, setModal] = useState<null | 'add' | EquityEntry>(null);
  const [stmtYear, setStmtYear] = useState(String(new Date().getFullYear()));
  const [showStatement, setShowStatement] = useState(false);

  const currentUser = getUserFromToken();
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
    staleTime: 5 * 60 * 1000,
  });
  const activeBranch = branches.find((b) => b.id === currentUser?.branchId) ?? branches[0];
  const branchInfo = {
    name: activeBranch?.name ?? 'XeroCare',
    address: activeBranch?.address,
    tax_registration_number: activeBranch?.tax_registration_number,
    country: activeBranch?.country,
  };

  const branchId = currentUser?.branchId;

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['equity-entries', branchId],
    queryFn: () => fetchEquityEntries(),
  });

  const { data: summary } = useQuery({
    queryKey: ['equity-summary', branchId],
    queryFn: () => fetchEquitySummary(),
  });

  const { data: statement } = useQuery({
    queryKey: ['equity-statement', branchId, stmtYear],
    queryFn: () => fetchEquityStatement({ year: stmtYear }),
    enabled: tab === 'statement',
  });

  const { data: balanceSheet } = useQuery({
    queryKey: ['balance-sheet', branchId],
    queryFn: () => fetchBalanceSheet(),
    enabled: tab === 'balance',
  });

  const { data: cashAccounts = [] } = useQuery({
    queryKey: ['cash-bank-accounts', branchId],
    queryFn: () => fetchCashBankAccounts(),
  });

  const invalidateEquity = () => {
    qc.invalidateQueries({ queryKey: ['equity-entries', branchId] });
    qc.invalidateQueries({ queryKey: ['equity-summary', branchId] });
  };

  const createMut = useMutation({
    mutationFn: createEquityEntry,
    onSuccess: () => {
      invalidateEquity();
      toast.success('Equity entry created');
      setModal(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create equity entry';
      toast.error(msg);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EquityEntry> }) =>
      updateEquityEntry(id, data),
    onSuccess: () => {
      invalidateEquity();
      toast.success('Updated');
      setModal(null);
    },
    onError: () => toast.error('Update failed'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteEquityEntry,
    onSuccess: () => {
      invalidateEquity();
      toast.success('Deleted');
    },
    onError: () => toast.error('Delete failed'),
  });

  const handleSave = (data: Partial<EquityEntry>) => {
    if (modal && modal !== 'add') {
      updateMut.mutate({ id: (modal as EquityEntry).id, data });
    } else {
      createMut.mutate(data);
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  // Composition donut data
  const compositionData = summary
    ? [
        { name: 'Share Capital', value: summary.shareCapital },
        { name: 'Retained Earnings', value: summary.retainedEarnings },
        { name: 'Reserves', value: summary.reserves },
        { name: 'Owner Contribution', value: summary.ownerContribution },
        { name: 'Dividends Paid', value: -summary.dividends },
      ].filter((d) => d.value > 0)
    : [];

  const assetLiabEquity =
    summary && balanceSheet
      ? [
          { label: 'Assets', value: summary.totalAssets },
          { label: 'Liabilities', value: balanceSheet.liabilities.total },
          { label: 'Net Equity', value: summary.netEquity },
        ]
      : [];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'entries', label: 'Equity Entries', icon: DollarSign },
    { id: 'statement', label: 'Statement of Changes', icon: TrendingUp },
    { id: 'balance', label: 'Balance Sheet', icon: Scale },
  ] as const;

  // Generate Statement — shape depends on the active tab: the real running-balance
  // Statement of Changes in Equity on that tab, a plain snapshot everywhere else.
  const buildStatementData = (): StatementData => {
    if (tab === 'statement' && statement) {
      return {
        kind: 'running-balance',
        title: 'Statement of Changes in Equity',
        subjectName: `Financial Year ${statement.year}`,
        periodFrom: `${statement.year}-01-01`,
        periodTo: `${statement.year}-12-31`,
        currency,
        openingBalance: statement.opening.total,
        closingBalance: statement.closing.total,
        balanceLabel: 'Closing Equity',
        rows: statement.movements.map((m) => ({
          date: m.date,
          reference: m.type,
          description: m.description,
          debit: m.total >= 0 ? m.total : undefined,
          credit: m.total < 0 ? -m.total : undefined,
        })),
      };
    }
    if (tab === 'balance' && balanceSheet) {
      return {
        kind: 'snapshot',
        title: 'Equity — Balance Sheet Position',
        asOfDate: new Date().toISOString().slice(0, 10),
        sections: [
          {
            title: 'Balance Sheet Summary',
            rows: [
              { label: 'Total Assets', value: formatCurrency(summary?.totalAssets ?? 0, currency) },
              {
                label: 'Total Liabilities',
                value: formatCurrency(balanceSheet.liabilities.total, currency),
              },
              { label: 'Net Equity', value: formatCurrency(summary?.netEquity ?? 0, currency) },
            ],
          },
        ],
      };
    }
    if (tab === 'entries') {
      return {
        kind: 'snapshot',
        title: 'Equity Entries',
        sections: [
          {
            title: 'Entries',
            rows: entries.map((e) => ({
              code: e.date?.slice(0, 10) ?? '',
              label: `${e.entryNo} — ${e.type.replace(/_/g, ' ')} — ${e.description}`,
              value: formatCurrency(e.amount, e.currency),
            })),
            total: {
              label: 'Net Total',
              value: formatCurrency(
                entries.reduce((s, e) => s + e.amount, 0),
                currency,
              ),
            },
          },
        ],
      };
    }
    // overview
    return {
      kind: 'snapshot',
      title: 'Equity — Overview',
      asOfDate: new Date().toISOString().slice(0, 10),
      sections: [
        {
          title: 'Composition',
          rows: compositionData.map((d) => ({
            label: d.name,
            value: formatCurrency(d.value, currency),
          })),
        },
      ],
      summary: [
        {
          label: 'Net Equity Position',
          value: formatCurrency(summary?.netEquity ?? 0, currency),
          bold: true,
        },
        { label: 'Total Assets', value: formatCurrency(summary?.totalAssets ?? 0, currency) },
      ],
    };
  };

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <PieIcon className="h-6 w-6 text-blue-600" /> Equity Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track owner&apos;s equity, capital movements and financial position
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStatement(true)}
            className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 bg-white hover:bg-gray-50"
          >
            <FileText className="h-4 w-4" /> Generate Statement
          </button>
          <button
            onClick={() => setModal('add')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> New Equity Entry
          </button>
        </div>
      </div>

      {/* Equity Position Banner */}
      {summary && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-blue-200 text-sm mb-1">Net Equity Position</p>
              <p className="text-3xl font-bold">{formatCurrency(summary.netEquity, currency)}</p>
              <p className="text-blue-200 text-sm mt-1">
                Total Assets: {formatCurrency(summary.totalAssets, currency)}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-blue-200 text-xs">Share Capital</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(summary.shareCapital, currency)}
                </p>
              </div>
              <div>
                <p className="text-blue-200 text-xs">Retained Earnings</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(summary.retainedEarnings, currency)}
                </p>
              </div>
              <div>
                <p className="text-blue-200 text-xs">Reserves</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(summary.reserves, currency)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              title="Share Capital"
              value={formatCurrency(summary?.shareCapital ?? 0, currency)}
              subtitle="Paid-in capital"
            />
            <StatCard
              title="Retained Earnings"
              value={formatCurrency(summary?.retainedEarnings ?? 0, currency)}
              subtitle="Cumulative profit"
            />
            <StatCard
              title="Reserves"
              value={formatCurrency(summary?.reserves ?? 0, currency)}
              subtitle="Set aside"
            />
            <StatCard
              title="Owner Contribution"
              value={formatCurrency(summary?.ownerContribution ?? 0, currency)}
              subtitle="Additional paid-in"
            />
            <StatCard
              title="Dividends YTD"
              value={formatCurrency(summary?.dividends ?? 0, currency)}
              subtitle="Distributed"
            />
            <StatCard
              title="Net Equity"
              value={formatCurrency(summary?.netEquity ?? 0, currency)}
              subtitle="Total equity"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Equity Composition</h3>
              <DonutChart data={compositionData} currency={currency} />
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Equity Growth Over Time</h3>
              <SimpleLineChart
                data={summary?.growthLine ?? []}
                xKey="month"
                lines={[{ key: 'equity', color: '#3b82f6', label: 'Net Equity' }]}
                currency={currency}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Assets / Liabilities / Equity
              </h3>
              <SimpleBarChart
                data={assetLiabEquity}
                xKey="label"
                bars={[{ key: 'value', color: '#3b82f6', label: 'Amount' }]}
                currency={currency}
              />
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Capital Movements (Waterfall)
              </h3>
              <WaterfallChart
                data={entries.slice(0, 12).map((e) => {
                  const positive = [
                    'SHARE_CAPITAL',
                    'RETAINED_EARNINGS',
                    'RESERVES',
                    'OWNER_CONTRIBUTION',
                    'PROFIT_TRANSFER',
                  ];
                  const sign = positive.includes(e.type) ? 1 : -1;
                  return {
                    name: e.type,
                    value: Number(e.amount),
                    start: 0,
                    fill: sign > 0 ? '#10b981' : '#ef4444',
                  };
                })}
                currency={currency}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Entries Tab ── */}
      {tab === 'entries' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-gray-800">Equity Entries ({entries.length})</h3>
            <button
              onClick={() => setModal('add')}
              className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" /> Add Entry
            </button>
          </div>
          {loadingEntries ? (
            <div className="p-8 text-center text-gray-400">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    {[
                      'Entry No',
                      'Date',
                      'Type',
                      'Description',
                      'Amount',
                      'Currency',
                      'Actions',
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400">
                        No equity entries yet
                      </td>
                    </tr>
                  ) : (
                    entries.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.entryNo}</td>
                        <td className="px-4 py-3">{e.date?.slice(0, 10)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[e.type] ?? 'bg-gray-100 text-gray-700'}`}
                          >
                            {e.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px] truncate" title={e.description}>
                          {e.description}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-800">
                          {formatCurrency(e.amount, currency)}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{e.currency}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setModal(e)}
                              className="text-blue-500 hover:text-blue-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this entry?')) deleteMut.mutate(e.id);
                              }}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Statement of Changes Tab ── */}
      {tab === 'statement' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Year:</label>
            <select
              value={stmtYear}
              onChange={(e) => setStmtYear(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[0, 1, 2, 3].map((offset) => {
                const y = String(new Date().getFullYear() - offset);
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>
          </div>

          {statement && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-800">
                  Statement of Changes in Equity — {statement.year}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-right">Share Capital</th>
                      <th className="px-4 py-3 text-right">Retained Earnings</th>
                      <th className="px-4 py-3 text-right">Reserves</th>
                      <th className="px-4 py-3 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr className="bg-blue-50 font-medium">
                      <td className="px-4 py-3 text-blue-800">
                        Opening Balance ({Number(statement.year) - 1})
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(statement.opening.shareCapital, currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(statement.opening.retainedEarnings, currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(statement.opening.reserves, currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(statement.opening.total, currency)}
                      </td>
                    </tr>
                    {statement.movements.map((m, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="text-gray-500 text-xs mr-2">{m.date?.slice(0, 10)}</span>
                          {m.description}
                          <span
                            className={`ml-2 px-1.5 py-0.5 rounded text-xs ${TYPE_BADGE[m.type] ?? 'bg-gray-100 text-gray-700'}`}
                          >
                            {m.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {m.shareCapital ? formatCurrency(m.shareCapital, currency) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {m.retainedEarnings ? formatCurrency(m.retainedEarnings, currency) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {m.reserves ? formatCurrency(m.reserves, currency) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(m.total, currency)}
                        </td>
                      </tr>
                    ))}
                    {statement.movements.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-gray-400 text-xs">
                          No movements in {statement.year}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-emerald-50 font-semibold">
                      <td className="px-4 py-3 text-emerald-800">
                        Closing Balance ({statement.year})
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(statement.closing.shareCapital, currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(statement.closing.retainedEarnings, currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(statement.closing.reserves, currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-lg">
                        {formatCurrency(statement.closing.total, currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Balance Sheet Tab ── */}
      {tab === 'balance' && (
        <div className="space-y-4">
          {balanceSheet ? (
            <>
              {/* Balance check banner */}
              <div
                className={`flex items-center gap-3 p-4 rounded-xl border ${balanceSheet.balanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}
              >
                {balanceSheet.balanced ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-emerald-500" />{' '}
                    <span className="font-semibold">Balance Sheet is Balanced ✓</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-amber-500" />{' '}
                    <span className="font-semibold">
                      Balance Sheet Difference: {formatCurrency(balanceSheet.difference, currency)}
                    </span>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Assets */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                  <h3 className="font-semibold text-blue-700 mb-4 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Assets
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Cash & Bank</span>
                      <span className="font-medium">
                        {formatCurrency(balanceSheet.assets.cash, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Fixed Assets (NBV)</span>
                      <span className="font-medium">
                        {formatCurrency(balanceSheet.assets.fixedAssetsNet, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Accounts Receivable</span>
                      <span className="font-medium">
                        {formatCurrency(balanceSheet.assets.accountsReceivable, currency)}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-semibold">
                      <span>Total Assets</span>
                      <span className="text-blue-700">
                        {formatCurrency(balanceSheet.assets.total, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Liabilities */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                  <h3 className="font-semibold text-red-700 mb-4 flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Liabilities
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Accounts Payable</span>
                      <span className="font-medium">
                        {formatCurrency(balanceSheet.liabilities.accountsPayable, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Accrued Expenses</span>
                      <span className="font-medium">
                        {formatCurrency(balanceSheet.liabilities.accruedExpenses, currency)}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-semibold">
                      <span>Total Liabilities</span>
                      <span className="text-red-700">
                        {formatCurrency(balanceSheet.liabilities.total, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Equity */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                  <h3 className="font-semibold text-emerald-700 mb-4 flex items-center gap-2">
                    <PieIcon className="h-4 w-4" />
                    Equity
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Net Equity</span>
                      <span className="font-medium">
                        {formatCurrency(balanceSheet.equity.total, currency)}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-semibold">
                      <span>Total Equity</span>
                      <span className="text-emerald-700">
                        {formatCurrency(balanceSheet.equity.total, currency)}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-semibold text-gray-800">
                      <span>Liabilities + Equity</span>
                      <span>
                        {formatCurrency(balanceSheet.totalLiabilitiesAndEquity, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side-by-side visual */}
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  Assets vs Liabilities + Equity
                </h3>
                <SimpleBarChart
                  data={[
                    {
                      group: 'Assets',
                      Cash: balanceSheet.assets.cash,
                      'Fixed Assets': balanceSheet.assets.fixedAssetsNet,
                      Receivables: balanceSheet.assets.accountsReceivable,
                    },
                    {
                      group: 'L + E',
                      Payables: balanceSheet.liabilities.accountsPayable,
                      'Accrued Exp': balanceSheet.liabilities.accruedExpenses,
                      Equity: balanceSheet.equity.total,
                    },
                  ]}
                  xKey="group"
                  bars={[
                    { key: 'Cash', color: '#3b82f6' },
                    { key: 'Fixed Assets', color: '#10b981' },
                    { key: 'Receivables', color: '#8b5cf6' },
                    { key: 'Payables', color: '#ef4444' },
                    { key: 'Accrued Exp', color: '#f97316' },
                    { key: 'Equity', color: '#06b6d4' },
                  ]}
                  currency={currency}
                />
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-400">
              Loading balance sheet…
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <EquityModal
          entry={modal === 'add' ? null : modal}
          cashAccounts={cashAccounts}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={isSaving}
        />
      )}

      {showStatement && (
        <StatementDialog
          open
          onOpenChange={(o) => !o && setShowStatement(false)}
          data={buildStatementData()}
          branch={branchInfo}
        />
      )}
    </div>
  );
}
