'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Download, Plus, X, Trash2, Pencil, Calendar, AlertCircle } from 'lucide-react';
import {
  fetchDepreciationBrandRules,
  upsertDepreciationBrandRule,
  deleteDepreciationBrandRule,
  fetchDepreciationModelRules,
  fetchAssetRegister,
  addAssetToRegister,
  updateAssetInRegister,
  disposeAsset,
  fetchDepreciationSchedule,
  fetchDepreciationJournals,
  postDepreciationJournal,
  fetchDepreciationCharts,
  type AssetDepreciationRegister,
  type DepreciationBrandRule,
  type DepreciationModelRule,
  type DepreciationScheduleRow,
} from '@/lib/finance/accountsApi';
import { SimpleBarChart, SimpleLineChart } from '@/components/accounts/charts';
import { fetchBranches } from '@/lib/finance/accounts';
import { formatCurrency } from '@/lib/format';
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
import api from '@/lib/api';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  FULLY_DEPRECIATED: 'bg-slate-100 text-slate-600 border-slate-200',
  DISPOSED: 'bg-red-100 text-red-700 border-red-200',
  SUSPENDED: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

const PIE_COLORS = ['#3b82f6', '#94a3b8', '#ef4444', '#f59e0b'];

// ─── Brand Rule Modal ──────────────────────────────────────────────────────────

function BrandRuleModal({
  rule,
  brands,
  onClose,
}: {
  rule?: DepreciationBrandRule;
  brands: { id: string; name: string }[];
  onClose: () => void;
}) {
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
      qc.invalidateQueries({ queryKey: ['dep-brand-rules'] });
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
            <label className="text-xs font-medium text-muted-foreground">Brand</label>
            <Select value={form.brandId} onValueChange={(v) => set('brandId', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Annual Dep. % / Year
              </label>
              <Input
                type="number"
                value={form.annualDepreciationPct}
                onChange={(e) => set('annualDepreciationPct', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Useful Life (Months)
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
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.brandId}
            className="flex-1"
          >
            {mut.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Asset Modal ───────────────────────────────────────────────────────────

function AddAssetModal({
  asset,
  brandRules,
  modelRules,
  // brands prop accepted but not used in this modal
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  brands: _,
  branches,
  onClose,
}: {
  asset?: AssetDepreciationRegister;
  brandRules: DepreciationBrandRule[];
  modelRules: DepreciationModelRule[];
  brands: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  onClose: () => void;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [products, setProducts] = useState<
    {
      id: string;
      serialNumber: string;
      modelName: string;
      brandName: string;
      brandId?: string;
      modelId?: string;
    }[]
  >([]);
  const [form, setForm] = useState({
    productId: asset?.productId ?? '',
    brandId: asset?.brandId ?? '',
    modelId: asset?.modelId ?? '',
    branchId: asset?.branchId ?? branches[0]?.id ?? '',
    purchaseDate: asset?.purchaseDate?.slice(0, 10) ?? todayStr,
    purchasePrice: asset?.purchasePrice?.toString() ?? '',
    annualDepreciationPct: asset?.annualDepreciationPct?.toString() ?? '20',
    usefulLifeMonths: asset?.usefulLifeMonths?.toString() ?? '60',
    salvageValuePct: asset?.salvageValuePct?.toString() ?? '10',
    method: asset?.method ?? 'STRAIGHT_LINE',
    status: asset?.status ?? 'ACTIVE',
    notes: asset?.notes ?? '',
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  React.useEffect(() => {
    api
      .get('/i/products', { params: { status: 'available' } })
      .then((r) => setProducts(r.data?.data ?? r.data ?? []))
      .catch(() => {});
  }, []);

  const onProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      set('productId', productId);
      return;
    }
    const modelRule = modelRules.find((r) => r.modelId === product.modelId);
    const brandRule = brandRules.find((r) => r.brandId === product.brandId);
    const rule = modelRule ?? brandRule;
    setForm((f) => ({
      ...f,
      productId,
      brandId: product.brandId ?? '',
      modelId: product.modelId ?? '',
      ...(rule
        ? {
            annualDepreciationPct: rule.annualDepreciationPct.toString(),
            usefulLifeMonths: rule.usefulLifeMonths.toString(),
            salvageValuePct: rule.salvageValuePct.toString(),
            method: rule.method,
          }
        : {}),
    }));
  };

  const salvageValue = useMemo(() => {
    const price = parseFloat(form.purchasePrice) || 0;
    const pct = parseFloat(form.salvageValuePct) || 0;
    return ((price * pct) / 100).toFixed(2);
  }, [form.purchasePrice, form.salvageValuePct]);

  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        purchasePrice: parseFloat(form.purchasePrice),
        annualDepreciationPct: parseFloat(form.annualDepreciationPct),
        usefulLifeMonths: parseInt(form.usefulLifeMonths),
        salvageValuePct: parseFloat(form.salvageValuePct),
      };
      if (asset?.id) return updateAssetInRegister(asset.id, payload);
      return addAssetToRegister(payload);
    },
    onSuccess: () => {
      toast.success(asset ? 'Asset updated' : 'Asset registered');
      qc.invalidateQueries({ queryKey: ['asset-register'] });
      onClose();
    },
    onError: () => toast.error('Failed to save asset'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-slate-800">
            {asset ? 'Edit Asset' : 'Add Asset to Register'}
          </h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {!asset && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Product (Serial #)
              </label>
              <Select value={form.productId} onValueChange={onProductChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.serialNumber} — {p.brandName} {p.modelName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Purchase Date</label>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => set('purchaseDate', e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Purchase Price</label>
              <Input
                type="number"
                value={form.purchasePrice}
                onChange={(e) => set('purchasePrice', e.target.value)}
                className="mt-1"
                placeholder="0.00"
              />
            </div>
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
                Useful Life (Months)
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
              <label className="text-xs font-medium text-muted-foreground">
                Salvage Value (auto)
              </label>
              <Input
                value={salvageValue}
                readOnly
                className="mt-1 bg-muted/40 text-muted-foreground"
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
              <label className="text-xs font-medium text-muted-foreground">Branch</label>
              <Select value={form.branchId} onValueChange={(v) => set('branchId', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {asset && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="FULLY_DEPRECIATED">Fully Depreciated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.purchasePrice}
            className="flex-1"
          >
            {mut.isPending ? 'Saving...' : asset ? 'Update' : 'Register'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Drawer ───────────────────────────────────────────────────────────

function ScheduleDrawer({
  asset,
  onClose,
}: {
  asset: AssetDepreciationRegister;
  onClose: () => void;
}) {
  const { data: schedule = [], isLoading } = useQuery<DepreciationScheduleRow[]>({
    queryKey: ['dep-schedule', asset.id],
    queryFn: () => fetchDepreciationSchedule(asset.id),
    staleTime: 300_000,
  });

  const exportSchedule = () => {
    const ws = XLSX.utils.json_to_sheet(
      schedule.map((r) => ({
        Month: `${r.year}-${String(r.month).padStart(2, '0')}`,
        'Opening NBV': r.openingNBV.toFixed(2),
        'Monthly Dep': r.monthlyDep.toFixed(2),
        'Accumulated Dep': r.accumulatedDep.toFixed(2),
        'Closing NBV': r.closingNBV.toFixed(2),
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Schedule');
    XLSX.writeFile(wb, `DepSchedule_${asset.productId}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-full max-w-2xl bg-card shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-bold text-slate-800">Depreciation Schedule</h2>
            <p className="text-xs text-muted-foreground">
              Method: {asset.method} | Useful Life: {asset.usefulLifeMonths} mo
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportSchedule} className="gap-2">
              <Download className="h-4 w-4" /> Excel
            </Button>
            <button onClick={onClose}>
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-muted/40 sticky top-0">
                <TableRow>
                  <TableHead className="pl-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Month
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Opening NBV
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Monthly Dep
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Accumulated
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground pr-4">
                    Closing NBV
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map((r, i) => (
                  <TableRow key={i} className="hover:bg-blue-50/30">
                    <TableCell className="pl-4 font-mono text-xs">
                      {r.year}-{String(r.month).padStart(2, '0')}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatCurrency(r.openingNBV)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-red-600">
                      {formatCurrency(r.monthlyDep)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatCurrency(r.accumulatedDep)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-xs pr-4">
                      {formatCurrency(r.closingNBV)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type SubTab = 'rules' | 'register' | 'summary' | 'journal';

export default function DepreciationPage() {
  const [subTab, setSubTab] = useState<SubTab>('register');
  const [showBrandRuleModal, setShowBrandRuleModal] = useState(false);
  const [editingBrandRule, setEditingBrandRule] = useState<DepreciationBrandRule | undefined>();
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetDepreciationRegister | undefined>();
  const [scheduleAsset, setScheduleAsset] = useState<AssetDepreciationRegister | undefined>();
  const [disposeTarget, setDisposeTarget] = useState<AssetDepreciationRegister | undefined>();
  const [disposeValue, setDisposeValue] = useState('0');
  const [postingJournal, setPostingJournal] = useState(false);

  const qc = useQueryClient();
  const now = new Date();

  const {
    data: assets = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<AssetDepreciationRegister[]>({
    queryKey: ['asset-register'],
    queryFn: () => fetchAssetRegister(),
    staleTime: 30_000,
  });

  const { data: brandRules = [] } = useQuery<DepreciationBrandRule[]>({
    queryKey: ['dep-brand-rules'],
    queryFn: () => fetchDepreciationBrandRules(),
    staleTime: 60_000,
  });

  const { data: modelRules = [] } = useQuery<DepreciationModelRule[]>({
    queryKey: ['dep-model-rules'],
    queryFn: () => fetchDepreciationModelRules(),
    staleTime: 60_000,
  });

  const { data: journals = [] } = useQuery({
    queryKey: ['dep-journals'],
    queryFn: () => fetchDepreciationJournals(),
    staleTime: 30_000,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchBranches(),
    staleTime: 300_000,
  });

  const { data: depCharts } = useQuery({
    queryKey: ['depreciation-charts'],
    queryFn: () =>
      fetchDepreciationCharts() as Promise<{
        costVsNBV: { brand: string; cost: number; nbv: number }[];
        statusPie: { name: string; value: number }[];
        monthlyCharge: { month: string; amount: number }[];
      }>,
    staleTime: 120_000,
  });

  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  React.useEffect(() => {
    api
      .get('/i/brands')
      .then((r) => setBrands(r.data?.data ?? r.data ?? []))
      .catch(() => {});
  }, []);

  const deleteBrandRuleMut = useMutation({
    mutationFn: deleteDepreciationBrandRule,
    onSuccess: () => {
      toast.success('Rule deleted');
      qc.invalidateQueries({ queryKey: ['dep-brand-rules'] });
    },
  });

  const disposeMut = useMutation({
    mutationFn: (id: string) =>
      disposeAsset(id, {
        disposalDate: now.toISOString().slice(0, 10),
        disposalValue: parseFloat(disposeValue),
      }),
    onSuccess: () => {
      toast.success('Asset disposed');
      qc.invalidateQueries({ queryKey: ['asset-register'] });
      setDisposeTarget(undefined);
    },
    onError: () => toast.error('Failed to dispose asset'),
  });

  const postMut = useMutation({
    mutationFn: (branchId: string) =>
      postDepreciationJournal({
        periodYear: now.getFullYear(),
        periodMonth: now.getMonth() + 1,
        branchId,
      }),
    onSuccess: () => {
      toast.success('Depreciation posted');
      qc.invalidateQueries({ queryKey: ['dep-journals'] });
      setPostingJournal(false);
    },
    onError: () => toast.error('Failed to post — may already be posted for this period'),
  });

  const totalCost = assets.reduce((s, a) => s + Number(a.purchasePrice), 0);
  const totalAccumulated = assets.reduce((s, a) => s + (Number(a.accumulated) || 0), 0);
  const totalNBV = assets.reduce((s, a) => s + (Number(a.nbv) || Number(a.purchasePrice)), 0);
  const fullyDep = assets.filter((a) => a.status === 'FULLY_DEPRECIATED').length;
  const thisMonthDep = assets
    .filter((a) => a.status === 'ACTIVE')
    .reduce((s, a) => s + (Number(a.monthlyDep) || 0), 0);

  const statusPieData = (() => {
    const map: Record<string, number> = {};
    assets.forEach((a) => {
      map[a.status] = (map[a.status] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  })();

  const brandNBVData = (() => {
    const map: Record<string, number> = {};
    assets.forEach((a) => {
      map[a.brandId] = (map[a.brandId] ?? 0) + (Number(a.nbv) || Number(a.purchasePrice));
    });
    return Object.entries(map)
      .map(([brand, nbv]) => ({ brand: brand.slice(0, 8) + '…', nbv }))
      .slice(0, 8);
  })();

  const TAB_LABELS: Record<SubTab, string> = {
    rules: 'Depreciation Rules',
    register: 'Asset Register',
    summary: 'Summary',
    journal: 'Journal',
  };

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
            Assets & Depreciation
          </h3>
          <p className="text-muted-foreground">
            Printer fleet depreciation tracking and journal management
          </p>
        </div>
      </div>

      {/* Sub-tab Nav */}
      <div className="flex gap-1 bg-card rounded-xl p-1 border border-slate-100 shadow-sm w-fit">
        {(Object.keys(TAB_LABELS) as SubTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${subTab === t ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-slate-800'}`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* RULES TAB */}
      {subTab === 'rules' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-700">Brand Depreciation Rules</h4>
            <Button
              onClick={() => {
                setEditingBrandRule(undefined);
                setShowBrandRuleModal(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Add Brand Rule
            </Button>
          </div>
          <div className="bg-card rounded-xl shadow-sm border border-slate-100 p-1">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="pl-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Brand ID
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Annual %
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Life (mo)
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Salvage %
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Method
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pr-4">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brandRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No brand rules yet. Add one above.
                    </TableCell>
                  </TableRow>
                ) : (
                  brandRules.map((r) => (
                    <TableRow key={r.id} className="hover:bg-blue-50/50">
                      <TableCell className="pl-4 font-mono text-xs">
                        {r.brandId.slice(0, 12)}…
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        {r.annualDepreciationPct}%
                      </TableCell>
                      <TableCell>{r.usefulLifeMonths}</TableCell>
                      <TableCell>{r.salvageValuePct}%</TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {r.method.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingBrandRule(r);
                              setShowBrandRuleModal(true);
                            }}
                            className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete?')) deleteBrandRuleMut.mutate(r.id);
                            }}
                            className="p-1.5 rounded-md hover:bg-red-50 text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-700">
              Model Rules{' '}
              <span className="text-xs font-normal text-muted-foreground">
                (override brand rules)
              </span>
            </h4>
          </div>
          <div className="bg-card rounded-xl shadow-sm border border-slate-100 p-1">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="pl-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Brand
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Model
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Annual %
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Life (mo)
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Salvage %
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pr-4">
                    Method
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No model rules configured
                    </TableCell>
                  </TableRow>
                ) : (
                  modelRules.map((r) => (
                    <TableRow key={r.id} className="hover:bg-blue-50/50">
                      <TableCell className="pl-4 font-mono text-xs">
                        {r.brandId.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.modelId.slice(0, 8)}…</TableCell>
                      <TableCell className="font-bold text-primary">
                        {r.annualDepreciationPct}%
                      </TableCell>
                      <TableCell>{r.usefulLifeMonths}</TableCell>
                      <TableCell>{r.salvageValuePct}%</TableCell>
                      <TableCell className="pr-4">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          {r.method.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* REGISTER TAB */}
      {subTab === 'register' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {assets.length} assets enrolled in depreciation register
            </p>
            <Button
              onClick={() => {
                setEditingAsset(undefined);
                setShowAddAsset(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Add Asset
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isError ? (
            <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center space-y-3">
              <p className="text-red-700 font-medium">Failed to load asset register.</p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="bg-card rounded-xl shadow-sm border border-slate-100 p-1 overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="pl-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Product
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Purchase Date
                    </TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Cost
                    </TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Monthly Dep
                    </TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Accumulated
                    </TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      NBV
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
                  {assets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                        No assets registered yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    assets.map((a) => (
                      <TableRow key={a.id} className="hover:bg-blue-50/50 transition-colors">
                        <TableCell className="pl-4 font-mono text-xs text-blue-600">
                          {a.productId?.slice(0, 12)}…
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {a.purchaseDate?.slice(0, 10)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(Number(a.purchasePrice))}
                        </TableCell>
                        <TableCell className="text-right text-sm text-red-600 font-medium">
                          {formatCurrency(Number(a.monthlyDep) || 0)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatCurrency(Number(a.accumulated) || 0)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-800">
                          {formatCurrency(Number(a.nbv) || Number(a.purchasePrice))}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${STATUS_BADGE[a.status] ?? ''}`}
                          >
                            {a.status.replace(/_/g, ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setScheduleAsset(a)}
                              className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                              title="View Schedule"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingAsset(a);
                                setShowAddAsset(true);
                              }}
                              className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {a.status === 'ACTIVE' && (
                              <button
                                onClick={() => setDisposeTarget(a)}
                                className="p-1.5 rounded-md hover:bg-red-50 text-red-500"
                                title="Dispose"
                              >
                                <AlertCircle className="h-3.5 w-3.5" />
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
          )}
        </div>
      )}

      {/* SUMMARY TAB */}
      {subTab === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard title="Total Assets" value={assets.length.toString()} subtitle="Enrolled" />
            <StatCard
              title="Total Cost"
              value={formatCurrency(totalCost)}
              subtitle="Original value"
            />
            <StatCard
              title="Accumulated Dep"
              value={formatCurrency(totalAccumulated)}
              subtitle="To date"
            />
            <StatCard title="Net Book Value" value={formatCurrency(totalNBV)} subtitle="Current" />
            <StatCard title="Fully Depreciated" value={fullyDep.toString()} subtitle="Assets" />
            <StatCard
              title="This Month"
              value={formatCurrency(thisMonthDep)}
              subtitle="Dep. charge"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-card shadow-sm border border-slate-100">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-base font-bold text-primary">NBV by Brand</h3>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={brandNBVData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="brand"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={{ borderRadius: '10px', fontSize: '12px' }}
                    />
                    <Bar dataKey="nbv" name="NBV" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl bg-card shadow-sm border border-slate-100">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-base font-bold text-primary">Assets by Status</h3>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Additional charts from backend pre-aggregated data */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-card shadow-sm border border-slate-100 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Cost vs NBV by Brand</h3>
              <SimpleBarChart
                data={depCharts?.costVsNBV ?? []}
                xKey="brand"
                bars={[
                  { key: 'cost', color: '#94a3b8', label: 'Cost' },
                  { key: 'nbv', color: '#3b82f6', label: 'NBV' },
                ]}
                height={200}
              />
            </div>
            <div className="rounded-2xl bg-card shadow-sm border border-slate-100 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Monthly Depreciation Charge
              </h3>
              <SimpleLineChart
                data={depCharts?.monthlyCharge ?? []}
                xKey="month"
                lines={[{ key: 'amount', color: '#f59e0b', label: 'Dep. Charge' }]}
                height={200}
              />
            </div>
          </div>
        </div>
      )}

      {/* JOURNAL TAB */}
      {subTab === 'journal' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-700">Monthly Depreciation Journal</h4>
              <p className="text-xs text-muted-foreground">
                Post monthly depreciation as an expense entry. Each period can only be posted once
                per branch.
              </p>
            </div>
            <Button onClick={() => setPostingJournal(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Post This Month
            </Button>
          </div>
          <div className="bg-card rounded-xl shadow-sm border border-slate-100 p-1">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="pl-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Period
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Total Dep Amount
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Posted At
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pr-4">
                    Branch
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      No journal entries yet
                    </TableCell>
                  </TableRow>
                ) : (
                  journals.map((j) => (
                    <TableRow key={j.id} className="hover:bg-blue-50/50">
                      <TableCell className="pl-4 font-mono text-sm font-bold">
                        {j.periodYear}-{String(j.periodMonth).padStart(2, '0')}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-800">
                        {formatCurrency(Number(j.totalAmount))}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${j.status === 'POSTED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}
                        >
                          {j.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {j.postedAt?.slice(0, 10) ?? '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground pr-4">
                        {j.branchId?.slice(0, 8)}…
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showBrandRuleModal && (
        <BrandRuleModal
          rule={editingBrandRule}
          brands={brands}
          onClose={() => setShowBrandRuleModal(false)}
        />
      )}

      {showAddAsset && (
        <AddAssetModal
          asset={editingAsset}
          brandRules={brandRules}
          modelRules={modelRules}
          brands={brands}
          branches={branches}
          onClose={() => setShowAddAsset(false)}
        />
      )}

      {scheduleAsset && (
        <ScheduleDrawer asset={scheduleAsset} onClose={() => setScheduleAsset(undefined)} />
      )}

      {disposeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="font-bold text-slate-800">Mark as Disposed</h2>
            <p className="text-sm text-muted-foreground">
              Product: {disposeTarget.productId?.slice(0, 16)}…
            </p>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Disposal / Sale Value
              </label>
              <Input
                type="number"
                value={disposeValue}
                onChange={(e) => setDisposeValue(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDisposeTarget(undefined)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => disposeMut.mutate(disposeTarget.id)}
                disabled={disposeMut.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {disposeMut.isPending ? 'Disposing…' : 'Confirm Dispose'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {postingJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="font-bold text-slate-800">
              Post Depreciation — {now.toLocaleString('default', { month: 'long' })}{' '}
              {now.getFullYear()}
            </h2>
            <p className="text-sm text-muted-foreground">
              Select a branch to post depreciation for. This month charge:{' '}
              <strong>{formatCurrency(thisMonthDep)}</strong>
            </p>
            <div className="space-y-2">
              {branches.map((b) => (
                <Button
                  key={b.id}
                  onClick={() => postMut.mutate(b.id)}
                  disabled={postMut.isPending}
                  variant="outline"
                  className="w-full justify-start"
                >
                  {postMut.isPending ? 'Posting…' : `Post for ${b.name}`}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              onClick={() => setPostingJournal(false)}
              className="w-full text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
