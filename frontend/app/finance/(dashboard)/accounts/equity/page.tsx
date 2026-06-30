'use client';

import React, { useState } from 'react';
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
  type EquityEntry,
  type EquityType,
} from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import {
  DonutChart,
  SimpleLineChart,
  SimpleBarChart,
  WaterfallChart,
} from '@/components/accounts/charts';

const EQUITY_TYPES: EquityType[] = [
  'SHARE_CAPITAL',
  'RETAINED_EARNINGS',
  'RESERVES',
  'OWNER_CONTRIBUTION',
  'DIVIDEND',
  'PROFIT_TRANSFER',
  'LOSS_TRANSFER',
  'OTHER',
];

const TYPE_BADGE: Record<string, string> = {
  SHARE_CAPITAL: 'bg-blue-100 text-blue-700',
  RETAINED_EARNINGS: 'bg-emerald-100 text-emerald-700',
  RESERVES: 'bg-purple-100 text-purple-700',
  OWNER_CONTRIBUTION: 'bg-amber-100 text-amber-700',
  DIVIDEND: 'bg-red-100 text-red-700',
  PROFIT_TRANSFER: 'bg-cyan-100 text-cyan-700',
  LOSS_TRANSFER: 'bg-orange-100 text-orange-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

// ─── Equity Entry Modal ───────────────────────────────────────────────────────

interface ModalProps {
  entry?: EquityEntry | null;
  cashAccounts: { id: string; name: string }[];
  onClose: () => void;
  onSave: (data: Partial<EquityEntry>) => void;
  saving: boolean;
}

function EquityModal({ entry, cashAccounts, onClose, onSave, saving }: ModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    date: entry?.date?.slice(0, 10) ?? today,
    type: (entry?.type ?? 'SHARE_CAPITAL') as EquityType,
    description: entry?.description ?? '',
    amount: entry?.amount ? String(entry.amount) : '',
    currency: entry?.currency ?? 'AED',
    referenceNo: entry?.referenceNo ?? '',
    linkedCashAccountId: entry?.linkedCashAccountId ?? '',
    notes: entry?.notes ?? '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount || !form.date) {
      toast.error('Date, description and amount are required');
      return;
    }
    onSave({
      ...form,
      amount: parseFloat(form.amount),
      linkedCashAccountId: form.linkedCashAccountId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
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
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
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
              <select
                value={form.currency}
                onChange={(e) => set('currency', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {['AED', 'USD', 'QAR', 'EUR'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reference No.</label>
            <input
              value={form.referenceNo}
              onChange={(e) => set('referenceNo', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Linked Cash/Bank Account (auto-creates cashbook entry)
            </label>
            <select
              value={form.linkedCashAccountId}
              onChange={(e) => set('linkedCashAccountId', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— none —</option>
              {cashAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
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
              disabled={saving}
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
  const qc = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'entries' | 'statement' | 'balance'>('overview');
  const [modal, setModal] = useState<null | 'add' | EquityEntry>(null);
  const [stmtYear, setStmtYear] = useState(String(new Date().getFullYear()));

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['equity-entries'],
    queryFn: () => fetchEquityEntries(),
  });

  const { data: summary } = useQuery({
    queryKey: ['equity-summary'],
    queryFn: () => fetchEquitySummary(),
  });

  const { data: statement } = useQuery({
    queryKey: ['equity-statement', stmtYear],
    queryFn: () => fetchEquityStatement({ year: stmtYear }),
    enabled: tab === 'statement',
  });

  const { data: balanceSheet } = useQuery({
    queryKey: ['balance-sheet'],
    queryFn: () => fetchBalanceSheet(),
    enabled: tab === 'balance',
  });

  const { data: cashAccounts = [] } = useQuery({
    queryKey: ['cash-bank-accounts'],
    queryFn: () => fetchCashBankAccounts(),
  });

  const createMut = useMutation({
    mutationFn: createEquityEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equity-entries'] });
      qc.invalidateQueries({ queryKey: ['equity-summary'] });
      toast.success('Equity entry created');
      setModal(null);
    },
    onError: () => toast.error('Failed to create equity entry'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EquityEntry> }) =>
      updateEquityEntry(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equity-entries'] });
      qc.invalidateQueries({ queryKey: ['equity-summary'] });
      toast.success('Updated');
      setModal(null);
    },
    onError: () => toast.error('Update failed'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteEquityEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equity-entries'] });
      qc.invalidateQueries({ queryKey: ['equity-summary'] });
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
        <button
          onClick={() => setModal('add')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> New Equity Entry
        </button>
      </div>

      {/* Equity Position Banner */}
      {summary && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-blue-200 text-sm mb-1">Net Equity Position</p>
              <p className="text-3xl font-bold">{formatCurrency(summary.netEquity)}</p>
              <p className="text-blue-200 text-sm mt-1">
                Total Assets: {formatCurrency(summary.totalAssets)}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-blue-200 text-xs">Share Capital</p>
                <p className="text-xl font-semibold">{formatCurrency(summary.shareCapital)}</p>
              </div>
              <div>
                <p className="text-blue-200 text-xs">Retained Earnings</p>
                <p className="text-xl font-semibold">{formatCurrency(summary.retainedEarnings)}</p>
              </div>
              <div>
                <p className="text-blue-200 text-xs">Reserves</p>
                <p className="text-xl font-semibold">{formatCurrency(summary.reserves)}</p>
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
              value={formatCurrency(summary?.shareCapital ?? 0)}
              subtitle="Paid-in capital"
            />
            <StatCard
              title="Retained Earnings"
              value={formatCurrency(summary?.retainedEarnings ?? 0)}
              subtitle="Cumulative profit"
            />
            <StatCard
              title="Reserves"
              value={formatCurrency(summary?.reserves ?? 0)}
              subtitle="Set aside"
            />
            <StatCard
              title="Owner Contribution"
              value={formatCurrency(summary?.ownerContribution ?? 0)}
              subtitle="Additional paid-in"
            />
            <StatCard
              title="Dividends YTD"
              value={formatCurrency(summary?.dividends ?? 0)}
              subtitle="Distributed"
            />
            <StatCard
              title="Net Equity"
              value={formatCurrency(summary?.netEquity ?? 0)}
              subtitle="Total equity"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Equity Composition</h3>
              <DonutChart data={compositionData} />
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Equity Growth Over Time</h3>
              <SimpleLineChart
                data={summary?.growthLine ?? []}
                xKey="month"
                lines={[{ key: 'equity', color: '#3b82f6', label: 'Net Equity' }]}
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
                          {formatCurrency(e.amount)}
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
                        {formatCurrency(statement.opening.shareCapital)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(statement.opening.retainedEarnings)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(statement.opening.reserves)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(statement.opening.total)}
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
                          {m.shareCapital ? formatCurrency(m.shareCapital) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {m.retainedEarnings ? formatCurrency(m.retainedEarnings) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {m.reserves ? formatCurrency(m.reserves) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(m.total)}
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
                        {formatCurrency(statement.closing.shareCapital)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(statement.closing.retainedEarnings)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(statement.closing.reserves)}
                      </td>
                      <td className="px-4 py-3 text-right text-lg">
                        {formatCurrency(statement.closing.total)}
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
                      Balance Sheet Difference: {formatCurrency(balanceSheet.difference)}
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
                        {formatCurrency(balanceSheet.assets.cash)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Fixed Assets (NBV)</span>
                      <span className="font-medium">
                        {formatCurrency(balanceSheet.assets.fixedAssetsNet)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Accounts Receivable</span>
                      <span className="font-medium">
                        {formatCurrency(balanceSheet.assets.receivables)}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-semibold">
                      <span>Total Assets</span>
                      <span className="text-blue-700">
                        {formatCurrency(balanceSheet.assets.total)}
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
                        {formatCurrency(balanceSheet.liabilities.payables)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Accrued Expenses</span>
                      <span className="font-medium">
                        {formatCurrency(balanceSheet.liabilities.accruedExpenses)}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-semibold">
                      <span>Total Liabilities</span>
                      <span className="text-red-700">
                        {formatCurrency(balanceSheet.liabilities.total)}
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
                        {formatCurrency(balanceSheet.equity.netEquity)}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-semibold">
                      <span>Total Equity</span>
                      <span className="text-emerald-700">
                        {formatCurrency(balanceSheet.equity.total)}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-semibold text-gray-800">
                      <span>Liabilities + Equity</span>
                      <span>{formatCurrency(balanceSheet.totalLiabilitiesAndEquity)}</span>
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
                      Receivables: balanceSheet.assets.receivables,
                    },
                    {
                      group: 'L + E',
                      Payables: balanceSheet.liabilities.payables,
                      'Accrued Exp': balanceSheet.liabilities.accruedExpenses,
                      Equity: balanceSheet.equity.netEquity,
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
    </div>
  );
}
