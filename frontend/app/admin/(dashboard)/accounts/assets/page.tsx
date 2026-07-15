'use client';

import React, { Suspense, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Plus, Search, Download, X, Trash2, Pencil, Calendar } from 'lucide-react';
import {
  fetchDepreciationBrandRules,
  upsertDepreciationBrandRule,
  deleteDepreciationBrandRule,
  fetchAssetRegister,
  addAssetToRegister,
  updateAssetInRegister,
  disposeAsset,
  fetchDepreciationJournals,
  postDepreciationJournal,
  fetchDepreciationCharts,
  type AssetDepreciationRegister,
  type DepreciationBrandRule,
} from '@/lib/finance/accountsApi';
import { SimpleBarChart, SimpleLineChart } from '@/components/accounts/charts';
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
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';

type SubTab = 'register' | 'rules' | 'journal';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  FULLY_DEPRECIATED: 'bg-slate-100 text-slate-600 border-slate-200',
  DISPOSED: 'bg-red-100 text-red-700 border-red-200',
  SUSPENDED: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

// ─── Brand Rule Modal ─────────────────────────────────────────────────────────
function BrandRuleModal({ rule, onClose }: { rule?: DepreciationBrandRule; onClose: () => void }) {
  const [form, setForm] = useState({
    brandId: rule?.brandId ?? '',
    annualDepreciationPct: rule?.annualDepreciationPct?.toString() ?? '20',
    usefulLifeMonths: rule?.usefulLifeMonths?.toString() ?? '60',
    salvageValuePct: rule?.salvageValuePct?.toString() ?? '10',
    method: rule?.method ?? 'STRAIGHT_LINE',
    notes: rule?.notes ?? '',
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () =>
      upsertDepreciationBrandRule({
        ...form,
        annualDepreciationPct: parseFloat(form.annualDepreciationPct),
        usefulLifeMonths: parseInt(form.usefulLifeMonths),
        salvageValuePct: parseFloat(form.salvageValuePct),
      }),
    onSuccess: () => {
      toast.success('Brand rule saved');
      qc.invalidateQueries({ queryKey: ['admin-dep-brand-rules'] });
      onClose();
    },
    onError: () => toast.error('Failed to save'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-slate-800">
            {rule ? 'Edit' : 'Add'} Brand Depreciation Rule
          </h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Brand ID</label>
            <Input
              value={form.brandId}
              onChange={(e) => set('brandId', e.target.value)}
              className="mt-1"
              placeholder="Brand UUID"
              disabled={!!rule}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Annual Dep. %</label>
              <Input
                type="number"
                value={form.annualDepreciationPct}
                onChange={(e) => set('annualDepreciationPct', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Useful Life (months)
              </label>
              <Input
                type="number"
                value={form.usefulLifeMonths}
                onChange={(e) => set('usefulLifeMonths', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Salvage Value %</label>
              <Input
                type="number"
                value={form.salvageValuePct}
                onChange={(e) => set('salvageValuePct', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Method</label>
              <Select value={form.method} onValueChange={(v) => set('method', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRAIGHT_LINE">Straight Line</SelectItem>
                  <SelectItem value="DECLINING_BALANCE">Declining Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <Input
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="mt-1"
              placeholder="Optional notes"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={!form.brandId || mut.isPending}
            className="flex-1"
          >
            {mut.isPending ? 'Saving…' : 'Save Rule'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Add/Edit Asset Modal ─────────────────────────────────────────────────────
function AssetModal({
  asset,
  branchId,
  onClose,
}: {
  asset?: AssetDepreciationRegister;
  onClose: () => void;
  branchId: string;
}) {
  const qc = useQueryClient();
  const isEdit = !!asset?.id;
  const [form, setForm] = useState({
    assetName: asset?.assetName ?? '',
    purchaseDate: asset?.purchaseDate
      ? String(asset.purchaseDate).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    purchasePrice: asset?.purchasePrice?.toString() ?? '',
    method: asset?.method ?? 'STRAIGHT_LINE',
    annualDepreciationPct: asset?.annualDepreciationPct?.toString() ?? '20',
    usefulLifeMonths: asset?.usefulLifeMonths?.toString() ?? '60',
    salvageValuePct: '10',
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => {
      const data = {
        assetName: form.assetName,
        purchaseDate: form.purchaseDate,
        purchasePrice: parseFloat(form.purchasePrice),
        method: form.method,
        annualDepreciationPct: parseFloat(form.annualDepreciationPct),
        usefulLifeMonths: parseInt(form.usefulLifeMonths),
        salvageValuePct: parseFloat(form.salvageValuePct),
        branchId,
      };
      if (isEdit) return updateAssetInRegister(asset!.id, data);
      return addAssetToRegister(data);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Asset updated' : 'Asset added');
      qc.invalidateQueries({ queryKey: ['admin-assets'] });
      onClose();
    },
    onError: () => toast.error('Failed to save asset'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-slate-800">{isEdit ? 'Edit Asset' : 'Add Asset'}</h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Asset Name *</label>
            <Input
              value={form.assetName}
              onChange={(e) => set('assetName', e.target.value)}
              className="mt-1"
              placeholder="e.g. Printer Model XR5000"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Purchase Date *</label>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => set('purchaseDate', e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Purchase Price *</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.purchasePrice}
                onChange={(e) => set('purchasePrice', e.target.value)}
                className="mt-1"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Method</label>
              <Select value={form.method} onValueChange={(v) => set('method', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRAIGHT_LINE">Straight Line</SelectItem>
                  <SelectItem value="DECLINING_BALANCE">Declining Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Annual Dep. %</label>
              <Input
                type="number"
                value={form.annualDepreciationPct}
                onChange={(e) => set('annualDepreciationPct', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Useful Life (months)
              </label>
              <Input
                type="number"
                value={form.usefulLifeMonths}
                onChange={(e) => set('usefulLifeMonths', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Salvage Value %</label>
              <Input
                type="number"
                value={form.salvageValuePct}
                onChange={(e) => set('salvageValuePct', e.target.value)}
                className="mt-1"
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
            disabled={!form.assetName || !form.purchasePrice || mut.isPending}
            className="flex-1"
          >
            {mut.isPending ? 'Saving…' : isEdit ? 'Update' : 'Add Asset'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Assets Content ───────────────────────────────────────────────────────────
function AssetsContent() {
  const currency = useBranchCurrency();
  const searchParams = useSearchParams();
  const branchIds = searchParams.get('branchIds') ?? '';
  const isSingleBranch = !!branchIds && !branchIds.includes(',');
  const singleBranchId = isSingleBranch ? branchIds : '';

  const [activeTab, setActiveTab] = useState<SubTab>('register');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<AssetDepreciationRegister | undefined>(undefined);
  const [editingRule, setEditingRule] = useState<DepreciationBrandRule | undefined>(undefined);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [postingJournal, setPostingJournal] = useState(false);

  const params: Record<string, string> = {};
  if (branchIds) params.branchIds = branchIds;

  const qc = useQueryClient();
  const now = new Date();

  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['admin-assets', branchIds],
    queryFn: () => fetchAssetRegister(params),
  });

  const { data: charts } = useQuery({
    queryKey: ['admin-dep-charts', branchIds],
    queryFn: () =>
      fetchDepreciationCharts(params) as Promise<{
        costVsNbv: { name: string; cost: number; nbv: number }[];
        monthlyCharge: { month: string; amount: number }[];
      }>,
  });

  const { data: brandRules = [] } = useQuery({
    queryKey: ['admin-dep-brand-rules'],
    queryFn: () => fetchDepreciationBrandRules(),
    staleTime: 120_000,
  });

  const { data: journals = [], isLoading: loadingJournals } = useQuery({
    queryKey: ['admin-dep-journals', branchIds],
    queryFn: () => fetchDepreciationJournals(singleBranchId ? { branchId: singleBranchId } : {}),
    enabled: activeTab === 'journal',
  });

  const deleteBrandRule = useMutation({
    mutationFn: (id: string) => deleteDepreciationBrandRule(id),
    onSuccess: () => {
      toast.success('Brand rule deleted');
      qc.invalidateQueries({ queryKey: ['admin-dep-brand-rules'] });
    },
    onError: () => toast.error('Failed to delete'),
  });

  const disposeMut = useMutation({
    mutationFn: (id: string) =>
      disposeAsset(id, { disposalDate: now.toISOString().slice(0, 10), disposalValue: 0 }),
    onSuccess: () => {
      toast.success('Asset disposed');
      qc.invalidateQueries({ queryKey: ['admin-assets'] });
    },
    onError: () => toast.error('Failed to dispose asset'),
  });

  const postMut = useMutation({
    mutationFn: () =>
      postDepreciationJournal({
        periodYear: now.getFullYear(),
        periodMonth: now.getMonth() + 1,
        branchId: singleBranchId,
      }),
    onSuccess: () => {
      toast.success('Depreciation posted');
      qc.invalidateQueries({ queryKey: ['admin-dep-journals'] });
      setPostingJournal(false);
    },
    onError: () => toast.error('Failed to post — may already be posted for this period'),
  });

  const filtered = useMemo(
    () =>
      assets.filter((a) => {
        if (!search) return true;
        return (
          (a.assetName ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (a.id ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (a.productId ?? '').toLowerCase().includes(search.toLowerCase())
        );
      }),
    [assets, search],
  );

  const totalCost = assets.reduce((s, a) => s + Number(a.purchasePrice ?? 0), 0);
  const totalNBV = assets.reduce((s, a) => s + Number(a.nbv ?? 0), 0);
  const totalAccDep = assets.reduce((s, a) => s + Number(a.accumulated ?? 0), 0);
  const activeCount = assets.filter((a) => a.status === 'ACTIVE').length;

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((a) => ({
        ID: a.id,
        Name: a.assetName,
        'Product ID': a.productId,
        'Purchase Date': a.purchaseDate,
        'Purchase Price': a.purchasePrice,
        'Acc. Depreciation': a.accumulated,
        NBV: a.nbv,
        Method: a.method,
        Status: a.status,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assets');
    XLSX.writeFile(wb, 'admin_assets.xlsx');
  };

  const TAB_LABELS: Record<SubTab, string> = {
    register: 'Asset Register',
    rules: 'Brand Rules',
    journal: 'Journals',
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {!isSingleBranch && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-700">
          Write actions are disabled when viewing multiple branches. Select a single branch to add,
          edit, or dispose assets.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total Cost"
          value={formatCurrency(totalCost, currency)}
          subtitle="Purchase value"
        />
        <StatCard
          title="Total NBV"
          value={formatCurrency(totalNBV, currency)}
          subtitle="Net book value"
        />
        <StatCard
          title="Accumulated Dep."
          value={formatCurrency(totalAccDep, currency)}
          subtitle="Total depreciated"
        />
        <StatCard title="Active Assets" value={activeCount.toString()} subtitle="In use" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Cost vs Net Book Value</h3>
          <SimpleBarChart
            data={charts?.costVsNbv ?? []}
            xKey="name"
            bars={[
              { key: 'cost', color: '#3b82f6', label: 'Cost' },
              { key: 'nbv', color: '#10b981', label: 'NBV' },
            ]}
            height={220}
            currency={currency}
          />
        </div>
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Monthly Depreciation Charge</h3>
          <SimpleLineChart
            data={charts?.monthlyCharge ?? []}
            xKey="month"
            lines={[{ key: 'amount', color: '#f59e0b', label: 'Depreciation' }]}
            height={220}
            currency={currency}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card rounded-xl p-1 border border-slate-100 shadow-sm w-fit">
        {(Object.entries(TAB_LABELS) as [SubTab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-slate-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Asset Register Tab */}
      {activeTab === 'register' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, ID…"
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={exportExcel}
              className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            {isSingleBranch && (
              <Button
                onClick={() => {
                  setEditing(undefined);
                  setShowAdd(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" /> Add Asset
              </Button>
            )}
          </div>
          {loadingAssets ? (
            <div className="p-8 text-center text-gray-400">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
                  <tr>
                    {[
                      'Name / ID',
                      'Purchase Date',
                      'Cost',
                      'Acc. Dep.',
                      'NBV',
                      'Method',
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
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-400">
                        No assets found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{a.assetName ?? '—'}</p>
                          <p className="font-mono text-xs text-gray-400">{a.id.slice(0, 8)}…</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {String(a.purchaseDate).slice(0, 10)}
                        </td>
                        <td className="px-4 py-3">{formatCurrency(a.purchasePrice, currency)}</td>
                        <td className="px-4 py-3 text-red-600">
                          {formatCurrency(a.accumulated, currency)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">
                          {formatCurrency(a.nbv, currency)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {a.method?.replace(/_/g, ' ') ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[a.status] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}
                          >
                            {a.status?.replace(/_/g, ' ') ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isSingleBranch && a.status === 'ACTIVE' && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditing(a);
                                  setShowAdd(true);
                                }}
                                className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Dispose this asset? This cannot be undone.'))
                                    disposeMut.mutate(a.id);
                                }}
                                className="p-1.5 rounded-md hover:bg-red-50 text-red-500"
                                title="Dispose"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
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

      {/* Brand Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Depreciation rates applied by brand</p>
            {isSingleBranch && (
              <Button
                onClick={() => {
                  setEditingRule(undefined);
                  setShowRuleModal(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" /> Add Rule
              </Button>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
                <tr>
                  {['Brand ID', 'Annual %', 'Life (months)', 'Salvage %', 'Method', 'Actions'].map(
                    (h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {brandRules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      No brand rules defined
                    </td>
                  </tr>
                ) : (
                  brandRules.map((r) => (
                    <tr key={r.brandId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {r.brandId.slice(0, 12)}…
                      </td>
                      <td className="px-4 py-3 font-semibold">{r.annualDepreciationPct}%</td>
                      <td className="px-4 py-3">{r.usefulLifeMonths}</td>
                      <td className="px-4 py-3">{r.salvageValuePct}%</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {r.method?.replace(/_/g, ' ') ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {isSingleBranch && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingRule(r);
                                setShowRuleModal(true);
                              }}
                              className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this brand rule?'))
                                  deleteBrandRule.mutate(r.brandId);
                              }}
                              className="p-1.5 rounded-md hover:bg-red-50 text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Journal Tab */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Depreciation journal entries posted</p>
            {isSingleBranch && (
              <Button
                onClick={() => setPostingJournal(true)}
                className="gap-2 bg-primary text-primary-foreground"
              >
                <Calendar className="h-4 w-4" /> Post This Month
              </Button>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {loadingJournals ? (
              <div className="p-8 text-center text-gray-400">Loading…</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
                  <tr>
                    {['Period', 'Total Charge', 'Assets', 'Posted At'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {journals.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-400">
                        No journals posted yet
                      </td>
                    </tr>
                  ) : (
                    journals.map((j, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">
                          {j.periodYear}-{String(j.periodMonth).padStart(2, '0')}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700">
                          {formatCurrency(j.totalAmount, currency)}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{j.assetCount ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {j.createdAt ? new Date(j.createdAt).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <AssetModal
          asset={editing}
          branchId={singleBranchId}
          onClose={() => {
            setShowAdd(false);
            setEditing(undefined);
          }}
        />
      )}
      {showRuleModal && (
        <BrandRuleModal
          rule={editingRule}
          onClose={() => {
            setShowRuleModal(false);
            setEditingRule(undefined);
          }}
        />
      )}
      {postingJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="font-bold text-slate-800">
              Post Depreciation — {now.toLocaleString('default', { month: 'long' })}{' '}
              {now.getFullYear()}
            </h2>
            <p className="text-sm text-muted-foreground">
              This will post depreciation for the selected branch for this period.
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setPostingJournal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => postMut.mutate()}
                disabled={postMut.isPending}
                className="flex-1 bg-primary text-primary-foreground"
              >
                {postMut.isPending ? 'Posting…' : 'Confirm Post'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminAssetsPage() {
  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
            Assets &amp; Depreciation
          </h3>
          <p className="text-muted-foreground">Asset management — across branches</p>
        </div>
        <Suspense>
          <BranchFilterBar />
        </Suspense>
      </div>
      <Suspense>
        <AssetsContent />
      </Suspense>
    </div>
  );
}
