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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  SHARE_CAPITAL: 'bg-primary/10 text-primary',
  RETAINED_EARNINGS: 'bg-success/10 text-success',
  RESERVES: 'bg-lease/10 text-lease',
  OWNER_CONTRIBUTION: 'bg-warning/10 text-warning',
  DIVIDEND: 'bg-destructive/10 text-destructive',
  WITHDRAWAL: 'bg-destructive/10 text-destructive',
  PROFIT_TRANSFER: 'bg-info/10 text-info',
  LOSS_TRANSFER: 'bg-warning/10 text-warning',
  OTHER: 'bg-muted text-foreground',
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
      if (!form.chequeNumber || !form.chequeBankName || !form.chequeDate) {
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
            // dueDate is a deprecated mirror of chequeDate server-side.
            chequeDueDate: form.chequeDate,
          }
        : {}),
    };
    onSave(payload as Partial<EquityEntry>);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card z-10">
          <h3 className="font-semibold text-foreground">
            {entry ? 'Edit Equity Entry' : 'New Equity Entry'}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                {isDividend ? 'Declaration Date' : 'Date'}
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Type</label>
              <Select value={form.type} onValueChange={(v) => set('type', v)}>
                <SelectTrigger className="w-full border-warning/30 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t] ?? t.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dividend — Payment Date, separate from the Declaration Date above */}
          {isDividend && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Payment Date{' '}
                <span className="text-muted-foreground font-normal">
                  (leave blank if not yet paid)
                </span>
              </label>
              <input
                type="date"
                value={form.paymentDate}
                onChange={(e) => set('paymentDate', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Description</label>
            <input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                <label className="block text-xs font-medium text-foreground mb-1">
                  Number of Shares
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.numberOfShares}
                  onChange={(e) => set('numberOfShares', e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Price per Share
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={form.pricePerShare}
                  onChange={(e) => set('pricePerShare', e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Reserves — reserve type + source */}
          {isReserves && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Reserve Type
                </label>
                <input
                  value={form.reserveType}
                  onChange={(e) => set('reserveType', e.target.value)}
                  placeholder="e.g. General Reserve"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Source</label>
                <Select value={form.reserveSource} onValueChange={(v) => set('reserveSource', v)}>
                  <SelectTrigger className="w-full border-warning/30 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIRECT_ENTRY">Direct Entry</SelectItem>
                    <SelectItem value="FROM_RETAINED_EARNINGS">From Retained Earnings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Currency</label>
              <div className="w-full border rounded-lg px-3 py-2 text-sm bg-muted font-medium">
                {form.currency}
              </div>
            </div>
          </div>

          {/* Payment Mode — Share Capital / Owner Contribution / Dividend / Withdrawal */}
          {showPaymentMode && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Payment Mode</label>
              <Select value={form.paymentMode} onValueChange={(v) => set('paymentMode', v)}>
                <SelectTrigger className="w-full border-warning/30 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Cheque details — mirrors the Cheque block on invoice/purchase payment forms.
              No cash movement happens now; a PENDING cheque is created instead, and Cash
              at Bank only moves once it's cleared in Accounts → Cheques. */}
          {isCheque && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="col-span-full text-xs font-medium text-warning">
                This creates a PENDING {isDividend || isWithdrawal ? 'Issued' : 'Received'} cheque
                record. Cash at Bank only moves once it&apos;s cleared in Accounts → Cheques.
              </p>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Cheque Number
                </label>
                <input
                  value={form.chequeNumber}
                  onChange={(e) => set('chequeNumber', e.target.value)}
                  placeholder="e.g. CHQ-001234"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Bank Name</label>
                <input
                  value={form.chequeBankName}
                  onChange={(e) => set('chequeBankName', e.target.value)}
                  placeholder="e.g. Emirates NBD"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Cheque Date{' '}
                  <span className="text-muted-foreground font-normal">
                    (earliest date it can be deposited)
                  </span>
                </label>
                <input
                  type="date"
                  value={form.chequeDate}
                  onChange={(e) => set('chequeDate', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Reference No.</label>
            <input
              value={form.referenceNo}
              onChange={(e) => set('referenceNo', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Share Capital — optional document reference (e.g. share certificate link) */}
          {isShareCapital && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Document Reference{' '}
                <span className="text-muted-foreground font-normal">
                  (e.g. certificate link, optional)
                </span>
              </label>
              <input
                value={form.documentUrl}
                onChange={(e) => set('documentUrl', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {!isCheque && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Linked Cash/Bank Account (auto-creates cashbook entry)
              </label>
              <Select
                value={form.linkedCashAccountId || '__NONE__'}
                onValueChange={(v) => {
                  const val = v === '__NONE__' ? '' : v;
                  set('linkedCashAccountId', val);
                  if (val) setConfirmNonCash(false);
                }}
              >
                <SelectTrigger className="w-full border-warning/30 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__NONE__">— none —</SelectItem>
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
              {balanceError && (
                <p className="mt-1 text-xs font-medium text-destructive">{balanceError}</p>
              )}
              {!form.linkedCashAccountId && (
                <label className="mt-2 flex items-start gap-2 text-xs text-warning bg-warning/10 border border-warning/30 rounded-lg px-3 py-2">
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
            <label className="block text-xs font-medium text-foreground mb-1">
              {isWithdrawal ? 'Reason' : 'Notes'}
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !!balanceError}
              className="flex-1 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
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
    <div className="bg-primary/10 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium text-foreground flex items-center gap-2">
            <PieIcon className="h-6 w-6 text-primary" /> Equity Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track owner&apos;s equity, capital movements and financial position
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStatement(true)}
            className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 bg-card hover:bg-muted"
          >
            <FileText className="h-4 w-4" /> Generate Statement
          </button>
          <button
            onClick={() => setModal('add')}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New Equity Entry
          </button>
        </div>
      </div>

      {/* Equity Position Banner */}
      {summary && (
        <div className="bg-gradient-to-r from-primary to-primary rounded-xl p-5 text-primary-foreground">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-primary text-sm mb-1">Net Equity Position</p>
              <p className="text-3xl font-bold">{formatCurrency(summary.netEquity, currency)}</p>
              <p className="text-primary text-sm mt-1">
                Total Assets: {formatCurrency(summary.totalAssets, currency)}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-primary text-xs">Share Capital</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(summary.shareCapital, currency)}
                </p>
              </div>
              <div>
                <p className="text-primary text-xs">Retained Earnings</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(summary.retainedEarnings, currency)}
                </p>
              </div>
              <div>
                <p className="text-primary text-xs">Reserves</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(summary.reserves, currency)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-card rounded-lg p-1 shadow-sm border w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.id ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}
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
            <div className="bg-card rounded-xl shadow-sm border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Equity Composition</h3>
              <DonutChart data={compositionData} currency={currency} />
            </div>
            <div className="bg-card rounded-xl shadow-sm border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Equity Growth Over Time
              </h3>
              <SimpleLineChart
                data={summary?.growthLine ?? []}
                xKey="month"
                lines={[{ key: 'equity', color: 'var(--chart-blue-mid)', label: 'Net Equity' }]}
                currency={currency}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl shadow-sm border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Assets / Liabilities / Equity
              </h3>
              <SimpleBarChart
                data={assetLiabEquity}
                xKey="label"
                bars={[{ key: 'value', color: 'var(--chart-blue-mid)', label: 'Amount' }]}
                currency={currency}
              />
            </div>
            <div className="bg-card rounded-xl shadow-sm border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">
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
                    fill: sign > 0 ? 'var(--chart-profit)' : 'var(--destructive)',
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
        <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-foreground">Equity Entries ({entries.length})</h3>
            <button
              onClick={() => setModal('add')}
              className="flex items-center gap-1 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" /> Add Entry
            </button>
          </div>
          {loadingEntries ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs uppercase text-muted-foreground">
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
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No equity entries yet
                      </td>
                    </tr>
                  ) : (
                    entries.map((e) => (
                      <tr key={e.id} className="hover:bg-muted">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {e.entryNo}
                        </td>
                        <td className="px-4 py-3">{e.date?.slice(0, 10)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[e.type] ?? 'bg-muted text-foreground'}`}
                          >
                            {e.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px] truncate" title={e.description}>
                          {e.description}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {formatCurrency(e.amount, currency)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{e.currency}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setModal(e)}
                              className="text-primary hover:text-primary"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this entry?')) deleteMut.mutate(e.id);
                              }}
                              className="text-destructive hover:text-destructive"
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
            <label className="text-sm font-medium text-foreground">Year:</label>
            <Select value={stmtYear} onValueChange={setStmtYear}>
              <SelectTrigger className="border-warning/30 text-sm w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3].map((offset) => {
                  const y = String(new Date().getFullYear() - offset);
                  return (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {statement && (
            <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-muted">
                <h3 className="font-semibold text-foreground">
                  Statement of Changes in Equity — {statement.year}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-right">Share Capital</th>
                      <th className="px-4 py-3 text-right">Retained Earnings</th>
                      <th className="px-4 py-3 text-right">Reserves</th>
                      <th className="px-4 py-3 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr className="bg-primary/10 font-medium">
                      <td className="px-4 py-3 text-primary">
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
                      <tr key={i} className="hover:bg-muted">
                        <td className="px-4 py-3">
                          <span className="text-muted-foreground text-xs mr-2">
                            {m.date?.slice(0, 10)}
                          </span>
                          {m.description}
                          <span
                            className={`ml-2 px-1.5 py-0.5 rounded text-xs ${TYPE_BADGE[m.type] ?? 'bg-muted text-foreground'}`}
                          >
                            {m.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-foreground">
                          {m.shareCapital ? formatCurrency(m.shareCapital, currency) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground">
                          {m.retainedEarnings ? formatCurrency(m.retainedEarnings, currency) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground">
                          {m.reserves ? formatCurrency(m.reserves, currency) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(m.total, currency)}
                        </td>
                      </tr>
                    ))}
                    {statement.movements.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-muted-foreground text-xs">
                          No movements in {statement.year}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-success/10 font-semibold">
                      <td className="px-4 py-3 text-success">Closing Balance ({statement.year})</td>
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
                className={`flex items-center gap-3 p-4 rounded-xl border ${balanceSheet.balanced ? 'bg-success/10 border-success/30 text-success' : 'bg-warning/10 border-warning/30 text-warning'}`}
              >
                {balanceSheet.balanced ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-success" />{' '}
                    <span className="font-semibold">Balance Sheet is Balanced ✓</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-warning" />{' '}
                    <span className="font-semibold">
                      Balance Sheet Difference: {formatCurrency(balanceSheet.difference, currency)}
                    </span>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Assets */}
                <div className="bg-card rounded-xl shadow-sm border p-5">
                  <h3 className="font-semibold text-primary mb-4 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Assets
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">Cash & Bank</span>
                      <span className="font-medium">
                        {formatCurrency(balanceSheet.assets.cash, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">Fixed Assets (NBV)</span>
                      <span className="font-medium">
                        {formatCurrency(balanceSheet.assets.fixedAssetsNet, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">Accounts Receivable</span>
                      <span className="font-medium">
                        {formatCurrency(balanceSheet.assets.accountsReceivable, currency)}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-semibold">
                      <span>Total Assets</span>
                      <span className="text-primary">
                        {formatCurrency(balanceSheet.assets.total, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Liabilities */}
                <div className="bg-card rounded-xl shadow-sm border p-5">
                  <h3 className="font-semibold text-destructive mb-4 flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Liabilities
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">Accounts Payable</span>
                      <span className="font-medium">
                        {formatCurrency(balanceSheet.liabilities.accountsPayable, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">Accrued Expenses</span>
                      <span className="font-medium">
                        {formatCurrency(balanceSheet.liabilities.accruedExpenses, currency)}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-semibold">
                      <span>Total Liabilities</span>
                      <span className="text-destructive">
                        {formatCurrency(balanceSheet.liabilities.total, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Equity */}
                <div className="bg-card rounded-xl shadow-sm border p-5">
                  <h3 className="font-semibold text-success mb-4 flex items-center gap-2">
                    <PieIcon className="h-4 w-4" />
                    Equity
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">Net Equity</span>
                      <span className="font-medium">
                        {formatCurrency(balanceSheet.equity.total, currency)}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-semibold">
                      <span>Total Equity</span>
                      <span className="text-success">
                        {formatCurrency(balanceSheet.equity.total, currency)}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-semibold text-foreground">
                      <span>Liabilities + Equity</span>
                      <span>
                        {formatCurrency(balanceSheet.totalLiabilitiesAndEquity, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side-by-side visual */}
              <div className="bg-card rounded-xl shadow-sm border p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">
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
                    { key: 'Cash', color: 'var(--chart-blue-mid)' },
                    { key: 'Fixed Assets', color: 'var(--chart-profit)' },
                    { key: 'Receivables', color: 'var(--lease)' },
                    { key: 'Payables', color: 'var(--destructive)' },
                    { key: 'Accrued Exp', color: 'var(--rent)' },
                    { key: 'Equity', color: 'var(--info)' },
                  ]}
                  currency={currency}
                />
              </div>
            </>
          ) : (
            <div className="bg-card rounded-xl shadow-sm border p-8 text-center text-muted-foreground">
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
