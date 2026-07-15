'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchCheques,
  fetchChequeSummary,
  fetchCashBankAccounts,
  createCheque,
  depositCheque,
  issueCheque,
  clearCheque,
  bounceCheque,
  cancelCheque,
  Cheque,
} from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  DEPOSITED: 'bg-blue-100 text-blue-700',
  ISSUED: 'bg-purple-100 text-purple-700',
  CLEARED: 'bg-emerald-100 text-emerald-700',
  BOUNCED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-3.5 w-3.5" />,
  DEPOSITED: <RefreshCw className="h-3.5 w-3.5" />,
  ISSUED: <RefreshCw className="h-3.5 w-3.5" />,
  CLEARED: <CheckCircle className="h-3.5 w-3.5" />,
  BOUNCED: <AlertTriangle className="h-3.5 w-3.5" />,
  CANCELLED: <XCircle className="h-3.5 w-3.5" />,
};

type ActionType = 'deposit' | 'issue' | 'clear' | 'bounce' | 'cancel';

// ─── Add Cheque Modal ─────────────────────────────────────────────────────────
function AddChequeModal({
  defaultType,
  cashAccounts,
  onClose,
}: {
  defaultType: 'RECEIVED' | 'ISSUED';
  cashAccounts: { id: string; name: string; bankName?: string }[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    chequeNo: '',
    bankName: '',
    partyName: '',
    amount: '',
    dueDate: '',
    issueDate: '',
    type: defaultType,
    description: '',
    accountId: '',
  });

  const mut = useMutation({
    mutationFn: () =>
      createCheque({
        ...form,
        amount: Number(form.amount),
        issueDate: form.issueDate || undefined,
        description: form.description || undefined,
        accountId: form.accountId || undefined,
        bankName: form.bankName || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cheques'] });
      qc.invalidateQueries({ queryKey: ['cheque-summary'] });
      toast.success('Cheque added');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to add cheque'),
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Add Cheque</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
            ×
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.chequeNo.trim()) return toast.error('Cheque number required');
            if (!form.partyName.trim()) return toast.error('Party name required');
            if (!form.amount || Number(form.amount) <= 0) return toast.error('Amount must be > 0');
            if (!form.dueDate) return toast.error('Due date required');
            mut.mutate();
          }}
          className="p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Type *</label>
              <select
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="RECEIVED">Received (from customer)</option>
                <option value="ISSUED">Issued (to vendor)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Cheque Number *</label>
              <input
                value={form.chequeNo}
                onChange={(e) => set('chequeNo', e.target.value)}
                placeholder="e.g. 001234"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Party Name *</label>
              <input
                value={form.partyName}
                onChange={(e) => set('partyName', e.target.value)}
                placeholder="Customer or vendor name"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Bank Name</label>
              <input
                value={form.bankName}
                onChange={(e) => set('bankName', e.target.value)}
                placeholder="e.g. Emirates NBD"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Amount *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                placeholder="0.00"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Due Date *</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Issue Date</label>
              <input
                type="date"
                value={form.issueDate}
                onChange={(e) => set('issueDate', e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Linked Account</label>
              <select
                value={form.accountId}
                onChange={(e) => set('accountId', e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.bankName ? ` (${a.bankName})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mut.isPending}
              className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {mut.isPending ? 'Saving…' : 'Add Cheque'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Action Modal ─────────────────────────────────────────────────────────────
function ChequeActionModal({
  cheque,
  action,
  cashAccounts,
  onClose,
}: {
  cheque: Cheque;
  action: ActionType;
  cashAccounts: { id: string; name: string; bankName?: string }[];
  onClose: () => void;
}) {
  const currency = useBranchCurrency();
  const qc = useQueryClient();
  const [accountId, setAccountId] = useState(cheque.accountId ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const actionFn = () => {
    if (action === 'deposit')
      return depositCheque(cheque.id, { accountId, depositDate: date, notes });
    if (action === 'issue') return issueCheque(cheque.id, { accountId, issueDate: date, notes });
    if (action === 'clear') return clearCheque(cheque.id, { notes });
    if (action === 'bounce') return bounceCheque(cheque.id, { notes });
    return cancelCheque(cheque.id, { notes });
  };

  const mut = useMutation({
    mutationFn: actionFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cheques'] });
      qc.invalidateQueries({ queryKey: ['cheque-summary'] });
      qc.invalidateQueries({ queryKey: ['cheque-notifications'] });
      toast.success(`Cheque ${action === 'clear' ? 'cleared' : action + 'ed'} successfully`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || `Failed to ${action} cheque`),
  });

  const needsAccount = action === 'deposit' || action === 'issue';
  const needsDate = action === 'deposit' || action === 'issue';

  const cfg: Record<ActionType, { label: string; color: string; desc: string }> = {
    deposit: {
      label: 'Deposit to Bank',
      color: 'bg-blue-600 hover:bg-blue-700',
      desc: 'Mark cheque as deposited. Cash at Bank increases only when you mark it Cleared.',
    },
    issue: {
      label: 'Issue to Vendor',
      color: 'bg-purple-600 hover:bg-purple-700',
      desc: 'Mark cheque as issued. Cash at Bank decreases only when you mark it Cleared.',
    },
    clear: {
      label: 'Mark Cleared',
      color: 'bg-emerald-600 hover:bg-emerald-700',
      desc: 'Bank confirms funds cleared. This moves the Cash at Bank balance.',
    },
    bounce: {
      label: 'Mark Bounced',
      color: 'bg-red-600 hover:bg-red-700',
      desc: 'Cheque bounced. No balance reversal needed (money never moved).',
    },
    cancel: {
      label: 'Cancel Cheque',
      color: 'bg-gray-600 hover:bg-gray-700',
      desc: 'Cancel this pending cheque.',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{cfg[action].label}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
            ×
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (needsAccount && !accountId) return toast.error('Please select a bank account');
            mut.mutate();
          }}
          className="p-6 space-y-4"
        >
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <p className="text-gray-500">{cfg[action].desc}</p>
            <p className="font-medium text-gray-800">
              {cheque.partyName} — #{cheque.chequeNo} — {formatCurrency(cheque.amount, currency)}
            </p>
            {cheque.sourceLabel && (
              <p className="text-xs text-gray-400">Source: {cheque.sourceLabel}</p>
            )}
          </div>
          {needsAccount && (
            <div>
              <label className="text-xs font-medium text-gray-600">Bank Account *</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select account…</option>
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.bankName ? ` (${a.bankName})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          {needsDate && (
            <div>
              <label className="text-xs font-medium text-gray-600">Transaction Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-600">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes…"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mut.isPending}
              className={`flex-1 text-white rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${cfg[action].color}`}
            >
              {mut.isPending ? 'Processing…' : cfg[action].label}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Action Buttons ───────────────────────────────────────────────────────────
function ActionButtons({
  cheque,
  onAction,
}: {
  cheque: Cheque;
  onAction: (c: Cheque, a: ActionType) => void;
}) {
  const actions: { action: ActionType; label: string; className: string; show: boolean }[] = [
    {
      action: 'deposit',
      label: 'Deposit',
      className: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
      show: cheque.type === 'RECEIVED' && cheque.status === 'PENDING',
    },
    {
      action: 'issue',
      label: 'Issue',
      className: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
      show: cheque.type === 'ISSUED' && cheque.status === 'PENDING',
    },
    {
      action: 'clear',
      label: 'Clear',
      className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
      show: ['DEPOSITED', 'ISSUED'].includes(cheque.status),
    },
    {
      action: 'bounce',
      label: 'Bounce',
      className: 'bg-red-100 text-red-700 hover:bg-red-200',
      show: ['DEPOSITED', 'ISSUED'].includes(cheque.status),
    },
    {
      action: 'cancel',
      label: 'Cancel',
      className: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      show: cheque.status === 'PENDING',
    },
  ];
  const visible = actions.filter((a) => a.show);
  if (visible.length === 0) return <span className="text-xs text-gray-400">—</span>;
  return (
    <div className="flex gap-1 flex-wrap">
      {visible.map(({ action, label, className }) => (
        <button
          key={action}
          onClick={() => onAction(cheque, action)}
          className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${className}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Stats Cards ──────────────────────────────────────────────────────────────
function StatsRow({
  summary,
  type,
  currency,
}: {
  summary: Record<string, { count: number; total: number }>;
  type: 'RECEIVED' | 'ISSUED';
  currency: string;
}) {
  const pending = summary['PENDING'] ?? { count: 0, total: 0 };
  const deposited = summary['DEPOSITED'] ?? summary['ISSUED'] ?? { count: 0, total: 0 };
  const cleared = summary['CLEARED'] ?? { count: 0, total: 0 };
  const bounced = summary['BOUNCED'] ?? { count: 0, total: 0 };
  const cancelled = summary['CANCELLED'] ?? { count: 0, total: 0 };
  const total = [pending, deposited, cleared, bounced, cancelled].reduce(
    (acc, s) => ({ count: acc.count + s.count, total: acc.total + s.total }),
    { count: 0, total: 0 },
  );

  const cards = [
    {
      label: 'Total',
      count: total.count,
      amount: total.total,
      color: 'text-gray-800',
      bg: 'bg-gray-50 border-gray-200',
    },
    {
      label: type === 'RECEIVED' ? 'Pending' : 'Pending',
      count: pending.count,
      amount: pending.total,
      color: 'text-yellow-700',
      bg: 'bg-yellow-50 border-yellow-200',
    },
    {
      label: type === 'RECEIVED' ? 'Deposited' : 'Issued',
      count: deposited.count,
      amount: deposited.total,
      color: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-200',
    },
    {
      label: 'Cleared',
      count: cleared.count,
      amount: cleared.total,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
    },
    {
      label: 'Bounced',
      count: bounced.count,
      amount: bounced.total,
      color: 'text-red-700',
      bg: 'bg-red-50 border-red-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-xl border p-3 ${c.bg}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{c.label}</p>
          <p className={`text-xl font-bold mt-0.5 ${c.color}`}>{c.count}</p>
          <p className={`text-xs font-semibold mt-0.5 ${c.color}`}>
            {formatCurrency(c.amount, currency)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Cheque Table ─────────────────────────────────────────────────────────────
function ChequeTable({
  cheques,
  loading,
  currency,
  onAction,
  emptyLabel,
}: {
  cheques: Cheque[];
  loading: boolean;
  currency: string;
  onAction: (c: Cheque, a: ActionType) => void;
  emptyLabel: string;
}) {
  const isOverdue = (c: Cheque) =>
    new Date(c.dueDate) < new Date() && ['PENDING', 'ISSUED'].includes(c.status);

  if (loading) return <div className="p-10 text-center text-gray-400">Loading…</div>;
  if (cheques.length === 0)
    return <div className="p-10 text-center text-gray-400">{emptyLabel}</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
          <tr>
            {['Cheque #', 'Party / Bank', 'Amount', 'Due Date', 'Source', 'Status', 'Actions'].map(
              (h) => (
                <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {cheques.map((c) => (
            <tr
              key={c.id}
              className={`transition-colors ${isOverdue(c) ? 'bg-red-50/40' : 'hover:bg-gray-50'}`}
            >
              <td className="px-4 py-3 font-mono text-gray-700 text-xs">{c.chequeNo}</td>
              <td className="px-4 py-3">
                <p className="font-medium text-gray-800 max-w-[140px] truncate">{c.partyName}</p>
                <p className="text-xs text-gray-400">{c.bankName ?? '—'}</p>
              </td>
              <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                {formatCurrency(c.amount, currency)}
              </td>
              <td
                className={`px-4 py-3 text-xs whitespace-nowrap ${isOverdue(c) ? 'text-red-600 font-bold' : 'text-gray-500'}`}
              >
                {String(c.dueDate).slice(0, 10)}
                {isOverdue(c) && <span className="ml-1 text-red-500">⚠</span>}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px]">
                {c.sourceLabel ? (
                  <span
                    className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-medium text-slate-600 max-w-[150px] truncate"
                    title={c.sourceLabel}
                  >
                    {c.sourceLabel}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[c.status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {STATUS_ICON[c.status]}
                  {c.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <ActionButtons cheque={c} onAction={onAction} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ChequesPage() {
  const currency = useBranchCurrency();
  const [activeTab, setActiveTab] = useState<'received' | 'issued'>('received');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [actionState, setActionState] = useState<{ cheque: Cheque; action: ActionType } | null>(
    null,
  );

  const params = useMemo(() => {
    const p: Record<string, string> = { type: activeTab === 'received' ? 'RECEIVED' : 'ISSUED' };
    if (statusFilter !== 'ALL') p.status = statusFilter;
    if (search.trim()) p.search = search.trim();
    if (dateFrom) p.dateFrom = dateFrom;
    if (dateTo) p.dateTo = dateTo;
    return p;
  }, [activeTab, statusFilter, search, dateFrom, dateTo]);

  const { data: cheques = [], isLoading } = useQuery({
    queryKey: ['cheques', params],
    queryFn: () => fetchCheques(params),
  });

  const { data: summary = { RECEIVED: {}, ISSUED: {} } } = useQuery({
    queryKey: ['cheque-summary'],
    queryFn: () => fetchChequeSummary(),
  });

  const { data: cashAccounts = [] } = useQuery({
    queryKey: ['cash-bank-accounts'],
    queryFn: () => fetchCashBankAccounts(),
  });

  const bankAccounts = cashAccounts
    .filter((a) => a.type === 'BANK')
    .map((a) => ({ id: a.id, name: a.name, bankName: a.bankName }));

  const openAction = (cheque: Cheque, action: ActionType) => setActionState({ cheque, action });

  const tabSummary =
    activeTab === 'received'
      ? ((summary as Record<string, Record<string, { count: number; total: number }>>)[
          'RECEIVED'
        ] ?? {})
      : ((summary as Record<string, Record<string, { count: number; total: number }>>)['ISSUED'] ??
        {});

  const statusOptions =
    activeTab === 'received'
      ? ['PENDING', 'DEPOSITED', 'CLEARED', 'BOUNCED', 'CANCELLED']
      : ['PENDING', 'ISSUED', 'CLEARED', 'BOUNCED', 'CANCELLED'];

  return (
    <div className="bg-blue-50/30 min-h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {activeTab === 'received' ? (
              <>
                <ArrowDownCircle className="h-6 w-6 text-emerald-600" /> Cheques from Customers
              </>
            ) : (
              <>
                <ArrowUpCircle className="h-6 w-6 text-blue-600" /> Cheques to Vendors
              </>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeTab === 'received'
              ? 'Cheques received from customers — deposited to bank, cleared when bank confirms'
              : 'Cheques issued to vendors — Cash at Bank moves only when bank clears payment'}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Cheque
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(
          [
            {
              key: 'received',
              label: 'Received (Customers)',
              icon: <TrendingUp className="h-4 w-4" />,
            },
            {
              key: 'issued',
              label: 'Issued (Vendors)',
              icon: <TrendingDown className="h-4 w-4" />,
            },
          ] as const
        ).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key);
              setStatusFilter('ALL');
            }}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <StatsRow
        summary={tabSummary}
        type={activeTab === 'received' ? 'RECEIVED' : 'ISSUED'}
        currency={currency}
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cheque #, party, bank, source…"
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Status</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Due date from"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Due date to"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <ChequeTable
          cheques={cheques}
          loading={isLoading}
          currency={currency}
          onAction={openAction}
          emptyLabel={`No ${activeTab === 'received' ? 'received' : 'issued'} cheques found`}
        />
      </div>

      {/* Modals */}
      {showAdd && (
        <AddChequeModal
          defaultType={activeTab === 'received' ? 'RECEIVED' : 'ISSUED'}
          cashAccounts={bankAccounts}
          onClose={() => setShowAdd(false)}
        />
      )}
      {actionState && (
        <ChequeActionModal
          cheque={actionState.cheque}
          action={actionState.action}
          cashAccounts={bankAccounts}
          onClose={() => setActionState(null)}
        />
      )}
    </div>
  );
}
