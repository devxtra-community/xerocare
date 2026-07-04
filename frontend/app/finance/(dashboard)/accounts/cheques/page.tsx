'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
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
import { getUserFromToken } from '@/lib/auth';

// ─── Status config ────────────────────────────────────────────────────────────
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

// ─── Add Cheque Modal ─────────────────────────────────────────────────────────
interface AddChequeModalProps {
  onClose: () => void;
  cashAccounts: { id: string; name: string; bankName?: string; currentBalance: number }[];
}

function AddChequeModal({ onClose, cashAccounts }: AddChequeModalProps) {
  const qc = useQueryClient();
  const currentUser = getUserFromToken();
  const [form, setForm] = useState({
    chequeNo: '',
    bankName: '',
    partyName: '',
    amount: '',
    dueDate: '',
    issueDate: '',
    type: 'RECEIVED' as 'RECEIVED' | 'ISSUED',
    description: '',
    accountId: '',
  });

  const mut = useMutation({
    mutationFn: () =>
      createCheque({
        chequeNo: form.chequeNo,
        bankName: form.bankName || undefined,
        partyName: form.partyName,
        amount: Number(form.amount),
        dueDate: form.dueDate,
        issueDate: form.issueDate || undefined,
        type: form.type,
        description: form.description || undefined,
        accountId: form.accountId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cheques'] });
      qc.invalidateQueries({ queryKey: ['cheque-summary'] });
      toast.success('Cheque added successfully');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to add cheque'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.chequeNo.trim()) return toast.error('Cheque number is required');
    if (!form.partyName.trim()) return toast.error('Party name is required');
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Amount must be > 0');
    if (!form.dueDate) return toast.error('Due date is required');
    mut.mutate();
  };

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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Branch info banner */}
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
                    {a.name} {a.bankName ? `(${a.bankName})` : ''}
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
type ActionType = 'deposit' | 'issue' | 'clear' | 'bounce' | 'cancel';

interface ChequeActionModalProps {
  cheque: Cheque;
  action: ActionType;
  cashAccounts: { id: string; name: string; bankName?: string }[];
  onClose: () => void;
}

function ChequeActionModal({ cheque, action, cashAccounts, onClose }: ChequeActionModalProps) {
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
      toast.success(`Cheque ${action}ed successfully`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || `Failed to ${action} cheque`),
  });

  const needsAccount = action === 'deposit' || action === 'issue';
  const needsDate = action === 'deposit' || action === 'issue';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (needsAccount && !accountId) return toast.error('Please select a bank account');
    mut.mutate();
  };

  const actionLabels: Record<ActionType, { label: string; color: string; desc: string }> = {
    deposit: {
      label: 'Deposit Cheque',
      color: 'bg-blue-600 hover:bg-blue-700',
      desc: 'Mark this cheque as deposited and credit the account.',
    },
    issue: {
      label: 'Issue Cheque',
      color: 'bg-purple-600 hover:bg-purple-700',
      desc: 'Mark this cheque as issued as payment and debit the account.',
    },
    clear: {
      label: 'Mark Cleared',
      color: 'bg-emerald-600 hover:bg-emerald-700',
      desc: 'Confirm the cheque has cleared the bank.',
    },
    bounce: {
      label: 'Mark Bounced',
      color: 'bg-red-600 hover:bg-red-700',
      desc: 'Mark as bounced. The cashbook entry will be reversed.',
    },
    cancel: {
      label: 'Cancel Cheque',
      color: 'bg-gray-600 hover:bg-gray-700',
      desc: 'Cancel this pending cheque.',
    },
  };

  const cfg = actionLabels[action];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{cfg.label}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <p className="text-gray-500">{cfg.desc}</p>
            <p className="font-medium text-gray-800">
              {cheque.partyName} — #{cheque.chequeNo} — {formatCurrency(cheque.amount)}
            </p>
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
                    {a.name} {a.bankName ? `(${a.bankName})` : ''}
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
              className={`flex-1 text-white rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${cfg.color}`}
            >
              {mut.isPending ? 'Processing…' : cfg.label}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Action Buttons ───────────────────────────────────────────────────────────
interface ChequeActionButtonsProps {
  cheque: Cheque;
  onAction: (cheque: Cheque, action: ActionType) => void;
}

function ChequeActionButtons({ cheque, onAction }: ChequeActionButtonsProps) {
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

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border p-4 flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold ${color}`}>{count}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ChequesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showAdd, setShowAdd] = useState(false);
  const [actionState, setActionState] = useState<{ cheque: Cheque; action: ActionType } | null>(
    null,
  );

  const params: Record<string, string> = {};
  if (statusFilter !== 'ALL') params.status = statusFilter;
  if (typeFilter !== 'ALL') params.type = typeFilter;
  if (search.trim()) params.search = search.trim();

  const { data: cheques = [], isLoading } = useQuery({
    queryKey: ['cheques', statusFilter, typeFilter, search],
    queryFn: () => fetchCheques(params),
  });

  const { data: summary = {} } = useQuery({
    queryKey: ['cheque-summary'],
    queryFn: fetchChequeSummary,
  });

  const { data: cashAccounts = [] } = useQuery({
    queryKey: ['cash-bank-accounts'],
    queryFn: () => fetchCashBankAccounts(),
  });

  const bankAccounts = cashAccounts
    .filter((a) => a.type === 'BANK')
    .map((a) => ({
      id: a.id,
      name: a.name,
      bankName: a.bankName,
      currentBalance: a.currentBalance,
    }));

  const openAction = (cheque: Cheque, action: ActionType) => setActionState({ cheque, action });

  return (
    <div className="bg-blue-50/30 min-h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cheque Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track received and issued cheques</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Cheque
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <SummaryCard label="Pending" count={summary['PENDING'] ?? 0} color="text-yellow-600" />
        <SummaryCard label="Deposited" count={summary['DEPOSITED'] ?? 0} color="text-blue-600" />
        <SummaryCard label="Issued" count={summary['ISSUED'] ?? 0} color="text-purple-600" />
        <SummaryCard label="Cleared" count={summary['CLEARED'] ?? 0} color="text-emerald-600" />
        <SummaryCard label="Bounced" count={summary['BOUNCED'] ?? 0} color="text-red-600" />
        <SummaryCard label="Cancelled" count={summary['CANCELLED'] ?? 0} color="text-gray-500" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cheque#, party, bank…"
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Status</option>
              {['PENDING', 'DEPOSITED', 'ISSUED', 'CLEARED', 'BOUNCED', 'CANCELLED'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="RECEIVED">Received</option>
              <option value="ISSUED">Issued</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Loading cheques…</div>
        ) : cheques.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <p className="text-lg">No cheques found</p>
            <p className="text-sm mt-1">Add your first cheque using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
                <tr>
                  {[
                    'Type',
                    'Cheque #',
                    'Party',
                    'Bank',
                    'Amount',
                    'Due Date',
                    'Status',
                    'Actions',
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {cheques.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          c.type === 'RECEIVED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {c.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">{c.chequeNo}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-32 truncate">
                      {c.partyName}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.bankName ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {formatCurrency(c.amount)}
                    </td>
                    <td
                      className={`px-4 py-3 text-xs ${
                        new Date(c.dueDate) < new Date() && c.status === 'PENDING'
                          ? 'text-red-600 font-semibold'
                          : 'text-gray-500'
                      }`}
                    >
                      {String(c.dueDate).slice(0, 10)}
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
                      <ChequeActionButtons cheque={c} onAction={openAction} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && <AddChequeModal cashAccounts={bankAccounts} onClose={() => setShowAdd(false)} />}
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
