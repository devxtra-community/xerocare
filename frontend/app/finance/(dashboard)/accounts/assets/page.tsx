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
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { getUserFromToken } from '@/lib/auth';
import { ASSET_CATEGORIES, CATEGORY_GROUPS } from '@/lib/assetCategories';
import { DepreciationPreview } from '@/components/accounts/DepreciationPreview';

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
  onClose,
}: {
  asset?: AssetDepreciationRegister;
  brandRules: DepreciationBrandRule[];
  modelRules: DepreciationModelRule[];
  onClose: () => void;
}) {
  const currentUser = getUserFromToken();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Fetch branch name from API using branchId in JWT
  const { data: branchData } = useQuery<{ name: string; id: string } | null>({
    queryKey: ['branch-detail', currentUser?.branchId],
    queryFn: () =>
      currentUser?.branchId
        ? api.get(`/i/branch/${currentUser.branchId}`).then((r) => r.data?.data ?? null)
        : Promise.resolve(null),
    enabled: !!currentUser?.branchId,
    staleTime: 600_000,
  });

  const branchDisplayName = branchData?.name
    ? branchData.name
    : currentUser?.branchId
      ? `Branch ${currentUser.branchId.slice(0, 8)}…`
      : 'Your Branch';

  // Asset type selection (only for new assets)
  const [assetType, setAssetType] = useState<'PRINTER_PRODUCT' | 'MANUAL_ASSET'>(
    asset?.assetType === 'MANUAL_ASSET' ? 'MANUAL_ASSET' : 'PRINTER_PRODUCT',
  );

  // Cascade selectors for PRINTER_PRODUCT path
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');

  // Fetch brands (FINANCE role now allowed)
  const { data: allBrands = [] } = useQuery<{ id: string; name: string; branch_id?: string }[]>({
    queryKey: ['brands-list'],
    queryFn: () => api.get('/i/brands').then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 300_000,
  });

  // Fetch all models — filter by selectedBrandId on the frontend
  const { data: allModels = [] } = useQuery<
    { id: string; model_name: string; brand_id: string; branch_id?: string }[]
  >({
    queryKey: ['models-list'],
    queryFn: () => api.get('/i/models').then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 300_000,
  });

  const filteredModels = useMemo(
    () => allModels.filter((m) => !selectedBrandId || m.brand_id === selectedBrandId),
    [allModels, selectedBrandId],
  );

  // Fetch AVAILABLE + RETURNED products for selected model (returned units also need depreciation)
  const { data: availableProductsRaw = [] } = useQuery<
    {
      id: string;
      serial_no: string;
      brand: string;
      product_status: string;
      purchase_price?: number | string;
      model_id: string;
      model?: { model_name: string; brand_id: string };
    }[]
  >({
    queryKey: ['products-for-asset', selectedModelId],
    queryFn: async () => {
      const [avail, returned] = await Promise.all([
        api
          .get('/i/products', {
            params: { modelId: selectedModelId, status: 'AVAILABLE', limit: 100 },
          })
          .then((r) => r.data?.data ?? r.data ?? []),
        api
          .get('/i/products', {
            params: { modelId: selectedModelId, status: 'RETURNED', limit: 100 },
          })
          .then((r) => r.data?.data ?? r.data ?? []),
      ]);
      return [...avail, ...returned];
    },
    enabled: !!selectedModelId,
    staleTime: 60_000,
  });

  const availableProducts = availableProductsRaw;

  // Form state
  const [form, setForm] = useState({
    productId: asset?.productId ?? '',
    assetCategory: asset?.assetCategory ?? '',
    assetName: asset?.assetName ?? '',
    purchaseDate: asset?.purchaseDate?.slice(0, 10) ?? todayStr,
    purchasePrice: asset?.purchasePrice?.toString() ?? '',
    annualDepreciationPct: asset?.annualDepreciationPct?.toString() ?? '20',
    usefulLifeMonths: asset?.usefulLifeMonths?.toString() ?? '60',
    salvageValuePct: asset?.salvageValuePct?.toString() ?? '10',
    method: asset?.method ?? 'STRAIGHT_LINE',
    status: asset?.status ?? 'ACTIVE',
    notes: asset?.notes ?? '',
    // resolved after product selection
    brandId: asset?.brandId ?? '',
    modelId: asset?.modelId ?? '',
    detectedRuleSource: '' as 'model' | 'brand' | '',
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // When a product is selected — auto-fill brand/model, purchase price, and look up dep rule
  const onProductSelect = (productId: string) => {
    const product = availableProducts.find((p) => p.id === productId);
    if (!product) return;

    const brandId = product.model?.brand_id ?? '';
    const modelId = product.model_id ?? '';

    const modelRule = modelRules.find((r) => r.modelId === modelId);
    const brandRule = brandRules.find((r) => r.brandId === brandId);
    const rule = modelRule ?? brandRule;

    // Auto-fill purchase price from product if available
    const autoPurchasePrice =
      product.purchase_price != null && Number(product.purchase_price) > 0
        ? Number(product.purchase_price).toString()
        : '';

    setForm((f) => ({
      ...f,
      productId,
      brandId,
      modelId,
      assetCategory: 'PRINTER_EQUIPMENT',
      assetName: '',
      purchasePrice: autoPurchasePrice || f.purchasePrice,
      ...(rule
        ? {
            annualDepreciationPct: rule.annualDepreciationPct.toString(),
            usefulLifeMonths: rule.usefulLifeMonths.toString(),
            salvageValuePct: rule.salvageValuePct.toString(),
            method: rule.method,
          }
        : {}),
      detectedRuleSource: modelRule ? 'model' : brandRule ? 'brand' : '',
    }));
  };

  // When category selected — auto-fill depreciation defaults
  const onCategoryChange = (categoryKey: string) => {
    const cat = ASSET_CATEGORIES[categoryKey];
    if (!cat) return;
    setForm((f) => ({
      ...f,
      assetCategory: categoryKey,
      assetName: f.assetName || cat.label,
      annualDepreciationPct: cat.depreciable
        ? (cat.defaultRate ?? 20).toString()
        : f.annualDepreciationPct,
      usefulLifeMonths: cat.depreciable ? (cat.defaultLife ?? 60).toString() : f.usefulLifeMonths,
      salvageValuePct: cat.depreciable ? (cat.salvagePct ?? 10).toString() : f.salvageValuePct,
    }));
  };

  const salvageValue = useMemo(() => {
    const price = parseFloat(form.purchasePrice) || 0;
    const pct = parseFloat(form.salvageValuePct) || 0;
    return (price * pct) / 100;
  }, [form.purchasePrice, form.salvageValuePct]);

  const selectedCat = ASSET_CATEGORIES[form.assetCategory];

  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => {
      const payload = {
        assetType,
        assetCategory: form.assetCategory || 'PRINTER_EQUIPMENT',
        assetName: form.assetName || null,
        productId: assetType === 'PRINTER_PRODUCT' ? form.productId || null : null,
        brandId: form.brandId || null,
        modelId: form.modelId || null,
        purchaseDate: form.purchaseDate,
        purchasePrice: parseFloat(form.purchasePrice),
        annualDepreciationPct: parseFloat(form.annualDepreciationPct),
        usefulLifeMonths: parseInt(form.usefulLifeMonths),
        salvageValuePct: parseFloat(form.salvageValuePct),
        method: form.method,
        notes: form.notes,
        status: form.status,
      };
      if (asset?.id) return updateAssetInRegister(asset.id, payload);
      return addAssetToRegister(payload);
    },
    onSuccess: () => {
      toast.success(asset ? 'Asset updated' : 'Asset registered');
      qc.invalidateQueries({ queryKey: ['asset-register'] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to save asset');
    },
  });

  const handleSubmit = () => {
    if (!form.purchaseDate) return toast.error('Purchase date is required');
    if (!form.purchasePrice || parseFloat(form.purchasePrice) <= 0)
      return toast.error('Enter a valid purchase price');
    if (assetType === 'PRINTER_PRODUCT' && !form.productId && !asset)
      return toast.error('Select a product');
    if (assetType === 'MANUAL_ASSET' && !form.assetCategory)
      return toast.error('Select an asset category');
    mut.mutate();
  };

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

        <div className="px-6 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Branch info (read-only from JWT) */}
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-600">Branch:</span>
            <span className="text-sm font-medium text-blue-800">{branchDisplayName}</span>
            <span className="text-xs text-blue-500 ml-auto">{currentUser?.role}</span>
          </div>

          {/* Asset type selector (new assets only) */}
          {!asset && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setAssetType('PRINTER_PRODUCT');
                  setSelectedBrandId('');
                  setSelectedModelId('');
                  setForm((f) => ({
                    ...f,
                    productId: '',
                    brandId: '',
                    modelId: '',
                    assetCategory: '',
                    assetName: '',
                    annualDepreciationPct: '20',
                    usefulLifeMonths: '60',
                    salvageValuePct: '10',
                    method: 'STRAIGHT_LINE',
                    detectedRuleSource: '',
                  }));
                }}
                className={`p-4 border-2 rounded-xl text-left transition ${assetType === 'PRINTER_PRODUCT' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="text-2xl mb-1">🖨️</div>
                <div className="text-sm font-semibold">Printer / Copier</div>
                <div className="text-xs text-gray-400 mt-0.5">From inventory</div>
              </button>
              <button
                onClick={() => {
                  setAssetType('MANUAL_ASSET');
                  setSelectedBrandId('');
                  setSelectedModelId('');
                  setForm((f) => ({
                    ...f,
                    productId: '',
                    brandId: '',
                    modelId: '',
                    assetCategory: '',
                    assetName: '',
                    annualDepreciationPct: '20',
                    usefulLifeMonths: '60',
                    salvageValuePct: '10',
                    method: 'STRAIGHT_LINE',
                    detectedRuleSource: '',
                  }));
                }}
                className={`p-4 border-2 rounded-xl text-left transition ${assetType === 'MANUAL_ASSET' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="text-2xl mb-1">🏢</div>
                <div className="text-sm font-semibold">Other Asset</div>
                <div className="text-xs text-gray-400 mt-0.5">Vehicle, Furniture…</div>
              </button>
            </div>
          )}

          {/* PRINTER PRODUCT PATH */}
          {assetType === 'PRINTER_PRODUCT' && !asset && (
            <div className="space-y-3">
              {/* Brand */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Brand *</label>
                <Select
                  value={selectedBrandId}
                  onValueChange={(v) => {
                    setSelectedBrandId(v);
                    setSelectedModelId('');
                    setForm((f) => ({
                      ...f,
                      productId: '',
                      brandId: '',
                      modelId: '',
                      detectedRuleSource: '',
                    }));
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select brand…" />
                  </SelectTrigger>
                  <SelectContent>
                    {allBrands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Model */}
              {selectedBrandId && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Model *</label>
                  <Select
                    value={selectedModelId}
                    onValueChange={(v) => {
                      setSelectedModelId(v);
                      setForm((f) => ({ ...f, productId: '', modelId: v, detectedRuleSource: '' }));
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select model…" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredModels.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          No models for this brand
                        </SelectItem>
                      ) : (
                        filteredModels.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.model_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Product (serial number) */}
              {selectedModelId && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Product / Serial # *
                  </label>
                  {availableProducts.length === 0 ? (
                    <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                      No available or returned products for this model in your branch.
                    </div>
                  ) : (
                    <Select value={form.productId} onValueChange={onProductSelect}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select product…" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProducts.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="font-mono">{p.serial_no}</span>
                            <span
                              className={`text-xs ml-2 ${
                                p.product_status === 'RETURNED'
                                  ? 'text-orange-500'
                                  : 'text-gray-400'
                              }`}
                            >
                              ({p.product_status})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {form.productId && form.detectedRuleSource && (
                    <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                      Depreciation rule auto-filled from {form.detectedRuleSource} settings
                    </div>
                  )}
                  {form.productId && !form.detectedRuleSource && (
                    <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                      No rule found — using default values. Adjust below if needed.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MANUAL ASSET PATH */}
          {assetType === 'MANUAL_ASSET' && !asset && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Asset Category *
                </label>
                <Select value={form.assetCategory} onValueChange={onCategoryChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select asset category…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {Object.entries(CATEGORY_GROUPS).map(([group, cats]) => (
                      <SelectGroup key={group}>
                        <SelectLabel className="text-xs text-gray-500 font-semibold uppercase px-2 py-1">
                          {group}
                        </SelectLabel>
                        {cats.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <span className="flex items-center gap-2">
                              <span>{cat.icon}</span>
                              <span>{cat.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category info card */}
              {form.assetCategory && selectedCat && (
                <div className="rounded-lg bg-blue-50 p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-blue-600">Class:</span>
                    <span className="font-medium">{selectedCat.class.replace('_', '-')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Depreciable:</span>
                    <span className="font-medium">{selectedCat.depreciable ? 'Yes' : 'No'}</span>
                  </div>
                  {selectedCat.depreciable && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-blue-600">Default Life:</span>
                        <span className="font-medium">{form.usefulLifeMonths} months</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">Annual Rate:</span>
                        <span className="font-medium">{form.annualDepreciationPct}%</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground">Asset Name *</label>
                <Input
                  value={form.assetName}
                  onChange={(e) => set('assetName', e.target.value)}
                  placeholder="e.g. Toyota Camry 2023"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Edit mode — show current asset info */}
          {asset && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Category:</span>
                <span className="font-medium">
                  {ASSET_CATEGORIES[asset.assetCategory]?.label ?? asset.assetCategory ?? 'Printer'}
                </span>
              </div>
              {asset.assetName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Name:</span>
                  <span className="font-medium">{asset.assetName}</span>
                </div>
              )}
              {asset.productId && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Product:</span>
                  <span className="font-mono text-xs">{asset.productId.slice(0, 16)}…</span>
                </div>
              )}
            </div>
          )}

          {/* Purchase details (always shown once context is ready) */}
          {(asset ||
            (assetType === 'PRINTER_PRODUCT' && form.productId) ||
            (assetType === 'MANUAL_ASSET' && form.assetCategory)) && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    value={form.purchaseDate}
                    max={todayStr}
                    onChange={(e) => set('purchaseDate', e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Purchase Price *
                  </label>
                  <Input
                    type="number"
                    value={form.purchasePrice}
                    onChange={(e) => set('purchasePrice', e.target.value)}
                    className="mt-1"
                    placeholder="0.00"
                    min={0}
                  />
                </div>
              </div>

              {/* Depreciation settings */}
              {(assetType === 'PRINTER_PRODUCT' || selectedCat?.depreciable !== false) && (
                <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-700">Depreciation Settings</h4>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Method</label>
                    <Select
                      value={form.method}
                      onValueChange={(v) => set('method', v as typeof form.method)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STRAIGHT_LINE">
                          Straight Line (equal monthly amount)
                        </SelectItem>
                        <SelectItem value="DECLINING_BALANCE">
                          Declining Balance (higher early)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Annual %</label>
                      <Input
                        type="number"
                        value={form.annualDepreciationPct}
                        onChange={(e) => set('annualDepreciationPct', e.target.value)}
                        className="mt-1"
                        min={0.1}
                        max={100}
                        step={0.1}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Life (months)
                      </label>
                      <Input
                        type="number"
                        value={form.usefulLifeMonths}
                        onChange={(e) => set('usefulLifeMonths', e.target.value)}
                        className="mt-1"
                        min={1}
                      />
                      <p className="text-xs text-gray-400 mt-0.5">
                        = {(parseInt(form.usefulLifeMonths) / 12).toFixed(1)} years
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Salvage %</label>
                      <Input
                        type="number"
                        value={form.salvageValuePct}
                        onChange={(e) => set('salvageValuePct', e.target.value)}
                        className="mt-1"
                        min={0}
                        max={50}
                        step={0.5}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Salvage Value (auto)
                      </label>
                      <Input
                        value={salvageValue.toFixed(2)}
                        readOnly
                        className="mt-1 bg-muted/40 text-muted-foreground"
                      />
                    </div>
                  </div>

                  {/* Live depreciation preview */}
                  {parseFloat(form.purchasePrice) > 0 && (
                    <DepreciationPreview
                      purchasePrice={parseFloat(form.purchasePrice)}
                      salvagePct={parseFloat(form.salvageValuePct) || 0}
                      usefulLifeMonths={parseInt(form.usefulLifeMonths) || 60}
                      annualDepreciationPct={parseFloat(form.annualDepreciationPct) || 20}
                      method={form.method as 'STRAIGHT_LINE' | 'DECLINING_BALANCE'}
                      currency="AED"
                    />
                  )}
                </div>
              )}

              {asset && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => set('status', v as typeof form.status)}
                  >
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

              <div>
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  className="w-full mt-1 border border-border rounded-md p-2 text-sm bg-background"
                  rows={2}
                  placeholder="Optional notes…"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-5">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mut.isPending} className="flex-1">
            {mut.isPending ? 'Saving…' : asset ? 'Update' : 'Register'}
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
    XLSX.writeFile(wb, `DepSchedule_${asset.id.slice(0, 8)}.xlsx`);
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
  const currentUser = getUserFromToken();
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
    mutationFn: () =>
      postDepreciationJournal({
        periodYear: now.getFullYear(),
        periodMonth: now.getMonth() + 1,
        branchId: currentUser?.branchId ?? '',
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
            Asset depreciation tracking and journal management
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
                    Brand
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
                        {brands.find((b) => b.id === r.brandId)?.name ??
                          r.brandId.slice(0, 12) + '…'}
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
                        {brands.find((b) => b.id === r.brandId)?.name ??
                          r.brandId.slice(0, 8) + '…'}
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
                      Asset
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Category
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
                      <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                        No assets registered yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    assets.map((a) => {
                      const catMeta = ASSET_CATEGORIES[a.assetCategory];
                      return (
                        <TableRow key={a.id} className="hover:bg-blue-50/50 transition-colors">
                          <TableCell className="pl-4 text-xs">
                            {a.assetName ? (
                              <span className="font-medium">{a.assetName}</span>
                            ) : a.productId ? (
                              <div className="space-y-0.5">
                                {a.brand_name || a.model_name ? (
                                  <div className="font-medium text-slate-800">
                                    {[a.brand_name, a.model_name].filter(Boolean).join(' ')}
                                  </div>
                                ) : null}
                                {a.serial_no ? (
                                  <div className="font-mono text-blue-600 text-[10px]">
                                    S/N: {a.serial_no}
                                  </div>
                                ) : (
                                  <div className="font-mono text-blue-400 text-[10px]">
                                    {a.productId.slice(0, 12)}…
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="flex items-center gap-1">
                              {catMeta?.icon && <span>{catMeta.icon}</span>}
                              <span>{catMeta?.label ?? a.assetCategory}</span>
                            </span>
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
                      );
                    })
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
              {disposeTarget.assetName ?? disposeTarget.productId?.slice(0, 16) ?? 'Asset'}
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
              This will post depreciation for your branch.
              <br />
              This month charge: <strong>{formatCurrency(thisMonthDep)}</strong>
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setPostingJournal(false)}
                className="flex-1 text-muted-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={() => postMut.mutate()}
                disabled={postMut.isPending}
                className="flex-1"
              >
                {postMut.isPending ? 'Posting…' : 'Post Depreciation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
