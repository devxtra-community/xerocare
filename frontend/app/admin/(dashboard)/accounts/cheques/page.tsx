'use client';

import React, { Suspense, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  TrendingDown,
  Eye,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchCheques,
  fetchChequeSummary,
  fetchCashBankAccounts,
  depositCheque,
  issueCheque,
  clearCheque,
  bounceCheque,
  cancelCheque,
  Cheque,
} from '@/lib/finance/accountsApi';
import { fetchBranches } from '@/lib/finance/accounts';
import { getUserFromToken } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';
import StatementDialog, { type SnapshotStatementData } from '@/components/shared/StatementDialog';
import {
  ChequeDetailModal,
  CHEQUE_TABLE_STATUS_BADGE as STATUS_BADGE,
  CHEQUE_STATUS_ICON as STATUS_ICON,
} from '@/components/accounts/ChequeDetailModal';

type ActionType = 'deposit' | 'issue' | 'clear' | 'bounce' | 'cancel';

function ChequeActionModal({
  cheque,
  action,
  cashAccounts,
  queryKeys,
  onClose,
}: {
  cheque: Cheque;
  action: ActionType;
  cashAccounts: { id: string; name: string; bankName?: string }[];
  queryKeys: unknown[][];
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
    if (action === 'clear') return clearCheque(cheque.id, { notes, clearedDate: date });
    if (action === 'bounce') return bounceCheque(cheque.id, { notes });
    return cancelCheque(cheque.id, { notes });
  };

  const mut = useMutation({
    mutationFn: actionFn,
    onSuccess: () => {
      queryKeys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      qc.invalidateQueries({ queryKey: ['cheque-notifications'] });
      toast.success(`Cheque ${action === 'clear' ? 'cleared' : action + 'ed'}`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || `Failed to ${action}`),
  });

  const needsAccount = action === 'deposit' || action === 'issue';
  const needsDate = action === 'deposit' || action === 'issue' || action === 'clear';
  const requiresReason = action === 'bounce' || action === 'cancel';

  const cfg: Record<ActionType, { label: string; color: string; desc: string }> = {
    deposit: {
      label: 'Deposit to Bank',
      color: 'bg-blue-600 hover:bg-blue-700',
      desc: 'Record cheque deposited. Cash at Bank increases only at CLEARED.',
    },
    issue: {
      label: 'Issue to Vendor',
      color: 'bg-purple-600 hover:bg-purple-700',
      desc: 'Record cheque issued. Cash at Bank decreases only at CLEARED.',
    },
    clear: {
      label: 'Mark Cleared',
      color: 'bg-emerald-600 hover:bg-emerald-700',
      desc: 'Bank confirms funds cleared — moves Cash at Bank balance now.',
    },
    bounce: {
      label: 'Mark Bounced',
      color: 'bg-red-600 hover:bg-red-700',
      desc: 'Cheque bounced. No balance reversal needed.',
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
          <h2 className="text-lg font-semibold">{cfg[action].label}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
            ×
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (needsAccount && !accountId) return toast.error('Select a bank account');
            if (requiresReason && !notes.trim())
              return toast.error('A reason is required for this action');
            mut.mutate();
          }}
          className="p-6 space-y-4"
        >
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <p className="text-gray-500">{cfg[action].desc}</p>
            <p className="font-medium">
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
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
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
              <label className="text-xs font-medium text-gray-600">
                {action === 'clear' ? 'Cleared / Cash Received Date' : 'Transaction Date'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-600">
              {requiresReason ? 'Reason *' : 'Notes'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              required={requiresReason}
              placeholder={requiresReason ? 'Explain why…' : 'Optional notes…'}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mut.isPending || (requiresReason && !notes.trim())}
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

function ActionButtons({
  cheque,
  onAction,
  onView,
}: {
  cheque: Cheque;
  onAction: (c: Cheque, a: ActionType) => void;
  onView: (c: Cheque) => void;
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
  return (
    <div className="flex gap-1 flex-wrap items-center">
      <button
        onClick={() => onView(cheque)}
        title="View details & payment proof"
        className="text-xs font-medium px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 inline-flex items-center gap-1"
      >
        <Eye className="h-3.5 w-3.5" /> View
      </button>
      {visible.map(({ action, label, className }) => (
        <button
          key={action}
          onClick={() => onAction(cheque, action)}
          className={`text-xs font-medium px-2 py-1 rounded-md ${className}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function StatsRow({
  summary,
  currency,
}: {
  summary: Record<string, { count: number; total: number }>;
  currency: string;
}) {
  const pending = summary['PENDING'] ?? { count: 0, total: 0 };
  const deposited = summary['DEPOSITED'] ?? summary['ISSUED'] ?? { count: 0, total: 0 };
  const cleared = summary['CLEARED'] ?? { count: 0, total: 0 };
  const bounced = summary['BOUNCED'] ?? { count: 0, total: 0 };
  const total = [pending, deposited, cleared, bounced].reduce(
    (acc, s) => ({ count: acc.count + s.count, total: acc.total + s.total }),
    { count: 0, total: 0 },
  );
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {[
        { label: 'Total', ...total, color: 'text-gray-800', bg: 'bg-gray-50 border-gray-200' },
        {
          label: 'Pending',
          ...pending,
          color: 'text-yellow-700',
          bg: 'bg-yellow-50 border-yellow-200',
        },
        {
          label: 'In Bank',
          ...deposited,
          color: 'text-blue-700',
          bg: 'bg-blue-50 border-blue-200',
        },
        {
          label: 'Cleared',
          ...cleared,
          color: 'text-emerald-700',
          bg: 'bg-emerald-50 border-emerald-200',
        },
        { label: 'Bounced', ...bounced, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
      ].map((c) => (
        <div key={c.label} className={`rounded-xl border p-3 ${c.bg}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{c.label}</p>
          <p className={`text-xl font-bold mt-0.5 ${c.color}`}>{c.count}</p>
          <p className={`text-xs font-semibold ${c.color}`}>{formatCurrency(c.total, currency)}</p>
        </div>
      ))}
    </div>
  );
}

function AdminChequesContent() {
  const currency = useBranchCurrency();
  const searchParams = useSearchParams();
  const branchIds = searchParams.get('branchIds') ?? '';
  const [activeTab, setActiveTab] = useState<'received' | 'issued'>('received');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [actionState, setActionState] = useState<{ cheque: Cheque; action: ActionType } | null>(
    null,
  );
  const [viewCheque, setViewCheque] = useState<Cheque | null>(null);
  const [showStatement, setShowStatement] = useState(false);

  const currentUser = getUserFromToken();
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
    staleTime: 5 * 60 * 1000,
  });
  const activeBranch = branchIds
    ? branches.find((b) => b.id === branchIds)
    : (branches.find((b) => b.id === currentUser?.branchId) ?? branches[0]);
  const branchInfo = {
    name: activeBranch?.name ?? 'XeroCare',
    address: activeBranch?.address,
    tax_registration_number: activeBranch?.tax_registration_number,
    country: activeBranch?.country,
  };

  const params = useMemo(() => {
    const p: Record<string, string> = { type: activeTab === 'received' ? 'RECEIVED' : 'ISSUED' };
    if (statusFilter !== 'ALL') p.status = statusFilter;
    if (search.trim()) p.search = search.trim();
    if (dateFrom) p.dateFrom = dateFrom;
    if (dateTo) p.dateTo = dateTo;
    if (branchIds) p.branchIds = branchIds;
    return p;
  }, [activeTab, statusFilter, search, dateFrom, dateTo, branchIds]);

  const queryKey = ['admin-cheques', params];
  const summaryKey = ['admin-cheque-summary', branchIds];

  const { data: cheques = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchCheques(params),
  });

  const { data: summary = { RECEIVED: {}, ISSUED: {} } } = useQuery({
    queryKey: summaryKey,
    queryFn: () => fetchChequeSummary(branchIds ? { branchIds } : undefined),
  });

  const { data: cashAccounts = [] } = useQuery({
    queryKey: ['admin-cash-bank'],
    queryFn: () => fetchCashBankAccounts(branchIds ? { branchIds } : {}),
  });

  const bankAccounts = cashAccounts
    .filter((a) => a.type === 'BANK')
    .map((a) => ({ id: a.id, name: a.name, bankName: a.bankName }));
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

  const isOverdue = (c: Cheque) =>
    new Date(c.dueDate) < new Date() && ['PENDING', 'ISSUED'].includes(c.status);

  const statementData: SnapshotStatementData = {
    kind: 'snapshot',
    title:
      activeTab === 'received'
        ? 'Cheques from Customers — Consolidated'
        : 'Cheques to Vendors — Consolidated',
    filters: {
      Search: search || undefined,
      Status: statusFilter !== 'ALL' ? statusFilter : undefined,
      'Due From': dateFrom || undefined,
      'Due To': dateTo || undefined,
    },
    sections: [
      {
        title: 'Cheques',
        rows: cheques.map((c) => ({
          code: String(c.dueDate).slice(0, 10),
          label: `#${c.chequeNo} — ${c.partyName}${c.bankName ? ` (${c.bankName})` : ''} — ${c.status}`,
          value: formatCurrency(c.amount, currency),
        })),
        total: {
          label: 'Total',
          value: formatCurrency(
            cheques.reduce((s, c) => s + Number(c.amount), 0),
            currency,
          ),
        },
      },
    ],
  };

  return (
    <div className="bg-gray-50 min-h-full p-6 space-y-6">
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
          <p className="text-sm text-gray-500">
            All branches — Cash at Bank moves only at CLEARED step
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
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Cheque
          </button>
        </div>
      </div>

      <BranchFilterBar />

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

      <StatsRow summary={tabSummary} currency={currency} />

      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cheque #, party, source…"
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
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
            className="border rounded-lg px-3 py-2 text-sm"
            title="Due date from"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
            title="Due date to"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : cheques.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No cheques found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
                <tr>
                  {[
                    'Cheque #',
                    'Party / Bank',
                    'Amount',
                    'Cheque Date',
                    'Due Date',
                    'Source',
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
                  <tr key={c.id} className={isOverdue(c) ? 'bg-red-50/40' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{c.chequeNo}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 max-w-[140px] truncate">
                        {c.partyName}
                      </p>
                      <p className="text-xs text-gray-400">{c.bankName ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">
                      {formatCurrency(c.amount, currency)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {c.type === 'RECEIVED'
                        ? c.chequeDate
                          ? String(c.chequeDate).slice(0, 10)
                          : '—'
                        : c.issueDate
                          ? String(c.issueDate).slice(0, 10)
                          : '—'}
                    </td>
                    <td
                      className={`px-4 py-3 text-xs whitespace-nowrap ${isOverdue(c) ? 'text-red-600 font-bold' : 'text-gray-500'}`}
                    >
                      {String(c.dueDate).slice(0, 10)}
                      {isOverdue(c) && ' ⚠'}
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
                      {(c.status === 'BOUNCED' || c.status === 'CANCELLED') && c.reason && (
                        <span
                          className="ml-1 inline-block cursor-help text-gray-400 hover:text-gray-600"
                          title={c.reason}
                        >
                          ⓘ
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ActionButtons
                        cheque={c}
                        onAction={(ch, a) => setActionState({ cheque: ch, action: a })}
                        onView={setViewCheque}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Add Cheque</h2>
              <button
                onClick={() => setShowAdd(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 text-sm text-gray-500">
              Cheques auto-populate from payments. Use this form for manually tracking cheques not
              linked to a bill.
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowAdd(false)}
                  className="border rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {actionState && (
        <ChequeActionModal
          cheque={actionState.cheque}
          action={actionState.action}
          cashAccounts={bankAccounts}
          queryKeys={[queryKey, summaryKey]}
          onClose={() => setActionState(null)}
        />
      )}
      {viewCheque && (
        <ChequeDetailModal
          cheque={viewCheque}
          currency={currency}
          onClose={() => setViewCheque(null)}
        />
      )}
      {showStatement && (
        <StatementDialog
          open
          onOpenChange={(o) => !o && setShowStatement(false)}
          data={statementData}
          branch={branchInfo}
        />
      )}
    </div>
  );
}

export default function AdminChequesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
      <AdminChequesContent />
    </Suspense>
  );
}
