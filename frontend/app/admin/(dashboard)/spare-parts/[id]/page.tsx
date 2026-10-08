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
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { toast } from 'sonner';
import { copyTextToClipboard } from '@/lib/clipboard';

export default function SparePartDetailPage() {
  const currency = useBranchCurrency();
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

  const handleCopy = async (text: string, field: string) => {
    if (!(await copyTextToClipboard(text))) {
      toast.error(`Could not copy ${field.toLowerCase()}`);
      return;
    }
    setCopiedField(field);
    toast.success(`${field} copied`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-card gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading spare part details...</p>
      </div>
    );
  }

  if (!part) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-card gap-4">
        <Settings className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-bold text-foreground">Spare part not found</p>
        <Button onClick={() => router.back()} className="bg-primary text-primary-foreground">
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
    <div className="min-h-screen bg-card p-4 sm:p-6 md:p-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-card border-border text-foreground hover:bg-muted"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-bold text-foreground">{part.part_name}</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/30">
                {part.brand}
              </span>
              {(part.quantity ?? 0) > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/30">
                  IN STOCK
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/30">
                  OUT OF STOCK
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              SKU: <span className="font-mono font-bold text-foreground">{part.sku}</span>
              {part.mpn && (
                <>
                  <span className="mx-2 text-muted-foreground">•</span>
                  MPN: <span className="font-mono font-bold text-foreground">{part.mpn}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="bg-card border border-primary/30 p-1 h-11 w-max mb-2">
          <TabsTrigger
            value="details"
            className="px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-bold uppercase transition-all"
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Details
          </TabsTrigger>
          <TabsTrigger
            value="stock"
            className="px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-bold uppercase transition-all"
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
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Pricing Details
                </h4>
                <div className="bg-primary/10 p-4 rounded-xl border border-primary/30">
                  <p className="text-[10px] font-semibold text-primary tracking-wider uppercase mb-1">
                    Selling Price
                  </p>
                  <p className="text-3xl font-extrabold text-primary">
                    {formatCurrency(part.base_price, currency)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted p-3 rounded-lg border border-border">
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-0.5">
                      Wholesale
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(part.wholesale_price ?? 0, currency)}
                    </p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg border border-border">
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-0.5">
                      Tax Rate
                    </p>
                    <p className="text-sm font-semibold text-foreground">{part.tax_rate ?? 0}%</p>
                  </div>
                </div>
                {(part.purchase_price ?? 0) > 0 && (
                  <div className="bg-muted p-3 rounded-lg border border-border">
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-0.5">
                      Purchase Price
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(part.purchase_price ?? 0, currency)}
                    </p>
                  </div>
                )}
                {(part.maxDiscountableAmount ?? part.max_discount_amount ?? 0) > 0 && (
                  <div className="bg-warning/10 p-3 rounded-lg border border-warning/30">
                    <p className="text-[9px] font-semibold text-warning uppercase mb-0.5">
                      Max Discount
                    </p>
                    <p className="text-sm font-semibold text-warning">
                      {formatCurrency(
                        part.maxDiscountableAmount ?? part.max_discount_amount ?? 0,
                        currency,
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Barcode */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col items-center">
                <div className="flex justify-between items-center w-full mb-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Spare Part Barcode
                  </h4>
                  <button
                    onClick={() => handleCopy(barcodeValue, 'Barcode ID')}
                    className="text-muted-foreground hover:text-primary p-1 rounded hover:bg-muted transition-colors"
                  >
                    {copiedField === 'Barcode ID' ? (
                      <Check size={14} className="text-success" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
                <div className="bg-muted p-4 rounded-xl border border-border/50 flex items-center justify-center w-full shadow-inner">
                  <Barcode value={barcodeValue} width={1.6} height={55} fontSize={12} margin={5} />
                </div>
                <p className="text-[10px] font-mono text-muted-foreground mt-2">{barcodeValue}</p>
              </div>
            </div>

            {/* RIGHT: Specs + Description */}
            <div className="lg:col-span-8 space-y-6">
              {/* Specifications */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-6 pb-3 border-b border-border">
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
                    value={formatCurrency(part.base_price, currency)}
                  />
                  <SpecRow
                    icon={<TrendingUp size={16} />}
                    label="Wholesale Price"
                    value={formatCurrency(part.wholesale_price ?? 0, currency)}
                  />
                </div>
              </div>

              {/* Compatible Models */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Layers size={16} className="text-muted-foreground" /> Compatible Models
                </h4>
                <div className="bg-muted p-4 rounded-xl border border-border">
                  <p className="text-sm font-semibold text-foreground leading-relaxed">
                    {compatibleModels}
                  </p>
                </div>
                {part.yield && (
                  <div className="mt-4 bg-success/10 p-4 rounded-xl border border-success/30">
                    <p className="text-[10px] font-bold text-success uppercase tracking-widest mb-1">
                      Yield / Life Specification
                    </p>
                    <p className="text-sm font-semibold text-success leading-relaxed">
                      {part.yield}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              {part.description && (
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Info size={16} className="text-muted-foreground" /> Description
                  </h4>
                  <div className="bg-muted p-5 rounded-xl border border-border space-y-1.5">
                    {part.description.split('\n').map((line, i) => (
                      <p key={i} className="text-sm text-foreground leading-relaxed flex gap-2">
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
              <p className="text-sm text-muted-foreground">Loading stock levels...</p>
            </div>
          ) : !stock ? null : (
            <div className="space-y-6">
              {/* Total banner */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex items-center gap-5">
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                    Total Stock Available
                  </p>
                  <p className="text-4xl font-extrabold text-foreground">{stock.totalStock}</p>
                  <p className="text-xs text-muted-foreground mt-1">units across all warehouses</p>
                </div>
              </div>

              {/* Warehouse breakdown */}
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Warehouse size={14} className="text-primary" /> Stock by Warehouse
                  </h4>
                </div>
                <div className="divide-y divide-border">
                  {stock.warehouses.length === 0 ? (
                    <p className="text-center py-10 text-sm text-muted-foreground">
                      No warehouse data available.
                    </p>
                  ) : (
                    stock.warehouses.map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between px-6 py-4 hover:bg-muted/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Warehouse className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm font-semibold text-foreground">{w.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Progress bar */}
                          <div className="w-32 bg-muted rounded-full h-2 hidden sm:block">
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
                                ? 'bg-success/10 text-success'
                                : w.quantity > 0
                                  ? 'bg-warning/10 text-warning'
                                  : 'bg-destructive/10 text-destructive'
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
    blue: 'bg-primary/10 text-primary',
    amber: 'bg-warning/10 text-warning',
    purple: 'bg-lease/10 text-lease',
    red: 'bg-destructive/10 text-destructive',
  };
  return (
    <div className="bg-card rounded-xl border border-border p-3 flex items-center gap-3 shadow-sm">
      <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p className="text-lg font-bold text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
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
    <div className="flex items-center justify-between py-3 border-b border-border hover:bg-muted/30 px-1 rounded transition-colors">
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
          <span className="text-sm font-semibold text-foreground mt-0.5">{value || '—'}</span>
        </div>
      </div>
      {hasCopy && value && value !== '—' && (
        <button
          onClick={onCopy}
          className="text-muted-foreground hover:text-primary p-1 rounded hover:bg-muted transition-colors"
        >
          {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
        </button>
      )}
    </div>
  );
}
