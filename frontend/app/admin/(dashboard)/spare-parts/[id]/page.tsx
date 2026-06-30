'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  Info,
  Loader2,
  Copy,
  Check,
  Warehouse,
  Truck,
  Hash,
  Settings,
  Building2,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Layers,
  BarChart3,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Barcode from 'react-barcode';
import { getSparePartById, getSparePartStock, SparePart, SparePartStock } from '@/lib/spare-part';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

export default function SparePartDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [part, setPart] = useState<SparePart | null>(null);
  const [stock, setStock] = useState<SparePartStock | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        const data = await getSparePartById(id);
        setPart(data);
      } catch {
        toast.error('Failed to load spare part details');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const fetchStock = async () => {
    if (stock || stockLoading) return;
    setStockLoading(true);
    try {
      const data = await getSparePartStock(id);
      setStock(data);
    } catch {
      toast.error('Failed to load stock data');
    } finally {
      setStockLoading(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copied`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50/50 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-slate-500">Loading spare part details...</p>
      </div>
    );
  }

  if (!part) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50/50 gap-4">
        <Settings className="h-12 w-12 text-slate-300" />
        <p className="text-lg font-bold text-slate-800">Spare part not found</p>
        <Button onClick={() => router.back()} className="bg-primary text-white">
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const barcodeValue = part.barcode_id || `XC-S-${part.sku}`;
  const lotNumber = part.lot?.lotNumber || part.lot?.lot_number || part.lotNumber || '—';
  const branchName = part.branch?.name || '—';
  const warehouseName = part.warehouse?.warehouseName || '—';
  const vendorName = part.vendor?.name || '—';

  const compatibleModels =
    part.compatible_model ||
    part.compatible_models ||
    (part.models && part.models.length > 0
      ? part.models.map((m) => m.model_name || m.model_no).join(', ')
      : part.model
        ? part.model.model_name || part.model.model_no
        : 'Universal / Multiple Models');

  return (
    <div className="min-h-screen bg-blue-50/40 p-4 sm:p-6 md:p-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-card border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-bold text-slate-800">{part.part_name}</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {part.brand}
              </span>
              {(part.quantity ?? 0) > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                  IN STOCK
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                  OUT OF STOCK
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              SKU: <span className="font-mono font-bold text-slate-700">{part.sku}</span>
              {part.mpn && (
                <>
                  <span className="mx-2 text-slate-300">•</span>
                  MPN: <span className="font-mono font-bold text-slate-700">{part.mpn}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="bg-white/50 border border-blue-100/50 p-1 h-11 w-max mb-2">
          <TabsTrigger
            value="details"
            className="px-5 data-[state=active]:bg-primary data-[state=active]:text-white text-xs font-bold uppercase transition-all"
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Details
          </TabsTrigger>
          <TabsTrigger
            value="stock"
            className="px-5 data-[state=active]:bg-primary data-[state=active]:text-white text-xs font-bold uppercase transition-all"
            onClick={fetchStock}
          >
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            Stock Levels
          </TabsTrigger>
        </TabsList>

        {/* ─── DETAILS TAB ─── */}
        <TabsContent value="details" className="focus-visible:outline-none focus-visible:ring-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT: Pricing + Barcode */}
            <div className="lg:col-span-4 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<Package className="h-4 w-4" />}
                  label="Total Qty"
                  value={String(part.quantity ?? 0)}
                  sub="Units"
                  color="blue"
                />
                <StatCard
                  icon={<Layers className="h-4 w-4" />}
                  label="Reserved"
                  value={String(part.reserved_quantity ?? 0)}
                  sub="Units"
                  color="amber"
                />
                <StatCard
                  icon={<ShoppingCart className="h-4 w-4" />}
                  label="Consumed"
                  value={String(part.consumed_quantity ?? 0)}
                  sub="Total used"
                  color="purple"
                />
                <StatCard
                  icon={<Info className="h-4 w-4" />}
                  label="Damaged"
                  value={String(part.damaged_quantity ?? 0)}
                  sub="Units"
                  color="red"
                />
              </div>

              {/* Pricing */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Pricing Details
                </h4>
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                  <p className="text-[10px] font-semibold text-blue-600 tracking-wider uppercase mb-1">
                    Selling Price
                  </p>
                  <p className="text-3xl font-extrabold text-blue-800">
                    {formatCurrency(part.base_price)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">
                      Wholesale
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {formatCurrency(part.wholesale_price ?? 0)}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">
                      Tax Rate
                    </p>
                    <p className="text-sm font-semibold text-slate-700">{part.tax_rate ?? 0}%</p>
                  </div>
                </div>
                {(part.purchase_price ?? 0) > 0 && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">
                      Purchase Price
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {formatCurrency(part.purchase_price ?? 0)}
                    </p>
                  </div>
                )}
                {(part.maxDiscountableAmount ?? part.max_discount_amount ?? 0) > 0 && (
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <p className="text-[9px] font-semibold text-amber-600 uppercase mb-0.5">
                      Max Discount
                    </p>
                    <p className="text-sm font-semibold text-amber-700">
                      {formatCurrency(part.maxDiscountableAmount ?? part.max_discount_amount ?? 0)}
                    </p>
                  </div>
                )}
              </div>

              {/* Barcode */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col items-center">
                <div className="flex justify-between items-center w-full mb-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Spare Part Barcode
                  </h4>
                  <button
                    onClick={() => handleCopy(barcodeValue, 'Barcode ID')}
                    className="text-slate-400 hover:text-primary p-1 rounded hover:bg-slate-50 transition-colors"
                  >
                    {copiedField === 'Barcode ID' ? (
                      <Check size={14} className="text-green-500" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 flex items-center justify-center w-full shadow-inner">
                  <Barcode value={barcodeValue} width={1.6} height={55} fontSize={12} margin={5} />
                </div>
                <p className="text-[10px] font-mono text-slate-400 mt-2">{barcodeValue}</p>
              </div>
            </div>

            {/* RIGHT: Specs + Description */}
            <div className="lg:col-span-8 space-y-6">
              {/* Specifications */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6 pb-3 border-b border-slate-100">
                  <Info size={16} className="text-primary" /> Technical Specifications
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                  <SpecRow icon={<Settings size={16} />} label="Part Name" value={part.part_name} />
                  <SpecRow icon={<Tag size={16} />} label="Brand" value={part.brand} />
                  <SpecRow
                    icon={<Hash size={16} />}
                    label="SKU"
                    value={part.sku}
                    hasCopy
                    onCopy={() => handleCopy(part.sku, 'SKU')}
                    copied={copiedField === 'SKU'}
                  />
                  {part.mpn && (
                    <SpecRow
                      icon={<Hash size={16} />}
                      label="MPN"
                      value={part.mpn}
                      hasCopy
                      onCopy={() => handleCopy(part.mpn!, 'MPN')}
                      copied={copiedField === 'MPN'}
                    />
                  )}
                  <SpecRow icon={<Building2 size={16} />} label="Branch" value={branchName} />
                  <SpecRow icon={<Warehouse size={16} />} label="Warehouse" value={warehouseName} />
                  <SpecRow icon={<Truck size={16} />} label="Vendor" value={vendorName} />
                  <SpecRow
                    icon={<Package size={16} />}
                    label="Lot ID"
                    value={lotNumber}
                    hasCopy={lotNumber !== '—'}
                    onCopy={() => handleCopy(lotNumber, 'Lot ID')}
                    copied={copiedField === 'Lot ID'}
                  />
                  <SpecRow
                    icon={<DollarSign size={16} />}
                    label="Selling Price"
                    value={formatCurrency(part.base_price)}
                  />
                  <SpecRow
                    icon={<TrendingUp size={16} />}
                    label="Wholesale Price"
                    value={formatCurrency(part.wholesale_price ?? 0)}
                  />
                </div>
              </div>

              {/* Compatible Models */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Layers size={16} className="text-slate-400" /> Compatible Models
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                    {compatibleModels}
                  </p>
                </div>
                {part.yield && (
                  <div className="mt-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">
                      Yield / Life Specification
                    </p>
                    <p className="text-sm font-semibold text-emerald-700 leading-relaxed">
                      {part.yield}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              {part.description && (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Info size={16} className="text-slate-400" /> Description
                  </h4>
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-1.5">
                    {part.description.split('\n').map((line, i) => (
                      <p key={i} className="text-sm text-slate-600 leading-relaxed flex gap-2">
                        <span className="text-primary mt-1">➤</span>
                        <span>{line.trim()}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ─── STOCK TAB ─── */}
        <TabsContent value="stock" className="focus-visible:outline-none focus-visible:ring-0">
          {stockLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-slate-400">Loading stock levels...</p>
            </div>
          ) : !stock ? null : (
            <div className="space-y-6">
              {/* Total banner */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex items-center gap-5">
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Total Stock Available
                  </p>
                  <p className="text-4xl font-extrabold text-slate-800">{stock.totalStock}</p>
                  <p className="text-xs text-slate-400 mt-1">units across all warehouses</p>
                </div>
              </div>

              {/* Warehouse breakdown */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Warehouse size={14} className="text-primary" /> Stock by Warehouse
                  </h4>
                </div>
                <div className="divide-y divide-slate-50">
                  {stock.warehouses.length === 0 ? (
                    <p className="text-center py-10 text-sm text-slate-400">
                      No warehouse data available.
                    </p>
                  ) : (
                    stock.warehouses.map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Warehouse className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="text-sm font-semibold text-slate-700">{w.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Progress bar */}
                          <div className="w-32 bg-slate-100 rounded-full h-2 hidden sm:block">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{
                                width:
                                  stock.totalStock > 0
                                    ? `${Math.min((w.quantity / stock.totalStock) * 100, 100)}%`
                                    : '0%',
                              }}
                            />
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              w.quantity > 10
                                ? 'bg-green-100 text-green-700'
                                : w.quantity > 0
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {w.quantity} units
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: 'blue' | 'amber' | 'purple' | 'red';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-3 shadow-sm">
      <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p className="text-lg font-bold text-slate-800">{value}</p>
        <p className="text-[10px] text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

function SpecRow({
  icon,
  label,
  value,
  hasCopy = false,
  onCopy,
  copied = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hasCopy?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 hover:bg-slate-50/30 px-1 rounded transition-colors">
      <div className="flex items-center gap-3">
        <div className="text-slate-400">{icon}</div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {label}
          </span>
          <span className="text-sm font-semibold text-slate-700 mt-0.5">{value || '—'}</span>
        </div>
      </div>
      {hasCopy && value && value !== '—' && (
        <button
          onClick={onCopy}
          className="text-slate-400 hover:text-primary p-1 rounded hover:bg-slate-50 transition-colors"
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
        </button>
      )}
    </div>
  );
}
