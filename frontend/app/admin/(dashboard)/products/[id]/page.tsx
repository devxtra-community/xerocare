'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Package,
  Info,
  FileText,
  List,
  Layers,
  Loader2,
  Copy,
  Check,
  Calendar,
  Warehouse,
  Truck,
  Hash,
  Eye,
  X,
  History,
  Boxes,
  Wrench,
  TrendingUp,
  LogIn,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import Image from 'next/image';
import { getProductById, Product as BaseProduct } from '@/lib/product';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { toast } from 'sonner';
import Barcode from 'react-barcode';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getProductHistory, ProductHistoryResponse, HistoryEvent } from '@/lib/productHistory';
import { resolveImageUrl } from '@/lib/imageUrl';
import MachineServiceAnalyticsPanel from '@/components/products/MachineServiceAnalyticsPanel';

interface ProductFeature {
  subHeading: string;
  description: string;
}

interface ProductConsumable {
  partName?: string;
  description?: string;
  yield?: string;
  price?: string | number;
}

interface Product extends Omit<BaseProduct, 'model'> {
  lot?: { lotNumber?: string; lot_number?: string };
  vendor?: { name?: string; vendor_name?: string };
  warehouse?: { warehouseName?: string; warehouse_name?: string; id?: string };
  model_id?: string;
  warehouse_name?: string;
  vendor_name?: string;
  barcode_id?: string;
  wholesale_price?: number;
  purchase_price?: number;
  features?: ProductFeature[];
  consumables?: ProductConsumable[];
  model?: {
    model_no: string;
    model_name?: string;
    modelName?: string;
  };
}

function parseFeaturesFromDescription(description?: string): ProductFeature[] {
  if (!description) return [];

  const textToParse = description.replace(
    /([A-Z][a-zA-Z0-9-]{1,30}(\s+[a-zA-Z0-9.-]{1,30})*):/g,
    '\n$1:',
  );
  const processedLines = textToParse.split(/\r?\n/);
  const features: ProductFeature[] = [];

  for (const line of processedLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0 && colonIndex < 40) {
      const subHeading = trimmed
        .substring(0, colonIndex)
        .replace(/^(?:⚙️|[\s•*-])+/, '')
        .trim();
      const desc = trimmed.substring(colonIndex + 1).trim();
      if (subHeading && desc && desc.length > 2) {
        features.push({ subHeading, description: desc });
      }
    }
  }

  return features;
}

export default function ProductDetailPage() {
  const currency = useBranchCurrency();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [history, setHistory] = useState<ProductHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const res = await getProductById(id);
        if (res) {
          setProduct(res);
        } else {
          toast.error('Failed to load product details');
        }
      } catch (err) {
        console.error('Failed to load product details:', err);
        toast.error('Failed to fetch product information');
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchHistory = async () => {
    if (history || historyLoading) return;
    setHistoryLoading(true);
    try {
      const data = await getProductHistory(id);
      setHistory(data);
    } catch {
      toast.error('Failed to load lifecycle history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-card p-6 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-card p-6 space-y-4">
        <p className="text-lg font-bold text-foreground">Product not found</p>
        <Button
          onClick={() => router.back()}
          className="bg-primary hover:opacity-90 text-primary-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const displayFeatures =
    product.features && product.features.length > 0
      ? product.features
      : parseFeaturesFromDescription(product.description);

  const mfdDate = product.MFD
    ? new Date(product.MFD).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

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
              <h3 className="text-lg sm:text-xl font-bold text-foreground">{product.name}</h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  product.product_status === 'AVAILABLE'
                    ? 'bg-success/10 text-success border border-success/30'
                    : product.product_status === 'RENTED'
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'bg-warning/10 text-warning border border-warning/30'
                }`}
              >
                {product.product_status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Model:{' '}
              {product.model
                ? `${product.model.model_no}${
                    product.model.model_name || product.model.modelName
                      ? ` - ${product.model.model_name || product.model.modelName}`
                      : ''
                  }`
                : product.model_id || '—'}
              <span className="mx-2 text-muted-foreground">•</span>
              Serial No: {product.serial_no}
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
            <Package className="h-3.5 w-3.5 mr-1.5" />
            Details
          </TabsTrigger>
          <TabsTrigger
            value="lifecycle"
            className="px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-bold uppercase transition-all"
            onClick={fetchHistory}
          >
            <History className="h-3.5 w-3.5 mr-1.5" />
            Lifecycle
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lifecycle" className="focus-visible:outline-none focus-visible:ring-0">
          <LifecycleTab
            history={history}
            loading={historyLoading}
            serialNumber={product.serial_no}
            currency={currency}
          />
        </TabsContent>

        <TabsContent value="details" className="focus-visible:outline-none focus-visible:ring-0">
          {/* DETAILED INFO GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Image, Price, Barcode */}
            <div className="lg:col-span-4 space-y-6">
              {/* Image Container */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col items-center">
                <div className="aspect-square relative w-full rounded-xl border border-border bg-muted/50 overflow-hidden flex items-center justify-center group">
                  {product.imageUrl ? (
                    <>
                      <Image
                        src={resolveImageUrl(product.imageUrl)}
                        alt={product.name}
                        fill
                        className="object-contain p-4"
                        unoptimized
                      />
                      <div
                        className="absolute inset-0 bg-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        onClick={() => setPreviewImage(product.imageUrl || null)}
                      >
                        <Eye size={20} className="text-primary-foreground" />
                      </div>
                    </>
                  ) : (
                    <Package size={64} className="text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Pricing Card */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-2">
                  Pricing Details
                </h4>
                <div className="bg-primary/10 p-4 rounded-xl border border-primary/30">
                  <p className="text-[10px] font-semibold text-primary tracking-wider uppercase mb-1">
                    Selling Price
                  </p>
                  <p className="text-3xl font-extrabold text-primary">
                    {formatCurrency(product.sale_price, currency)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted p-3 rounded-lg border border-border">
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-0.5">
                      Wholesale Price
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(product.wholesale_price || 0, currency)}
                    </p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg border border-border">
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-0.5">
                      Tax Rate
                    </p>
                    <p className="text-sm font-semibold text-foreground">{product.tax_rate}%</p>
                  </div>
                </div>
                {product.purchase_price && (
                  <div className="bg-muted p-3 rounded-lg border border-border">
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-0.5">
                      Purchase Price
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(product.purchase_price, currency)}
                    </p>
                  </div>
                )}
              </div>

              {/* Barcode Card */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col items-center">
                <div className="flex justify-between items-center w-full mb-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Product Barcode
                  </h4>
                  <button
                    onClick={() =>
                      handleCopy(product.barcode_id || `XC-P-${product.serial_no}`, 'Barcode ID')
                    }
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
                  <Barcode
                    value={product.barcode_id || `XC-P-${product.serial_no}`}
                    width={1.6}
                    height={55}
                    fontSize={12}
                    margin={5}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Spec Sheet, Desc, Features, Consumables */}
            <div className="lg:col-span-8 space-y-6">
              {/* Specifications Sheet */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-6 pb-3 border-b border-border">
                  <Info size={16} className="text-primary" /> Technical Specifications
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <SpecRow icon={<Package size={16} />} label="Product Name" value={product.name} />
                  <SpecRow icon={<Hash size={16} />} label="Brand" value={product.brand} />
                  <SpecRow
                    icon={<Info size={16} />}
                    label="Model"
                    value={
                      product.model
                        ? `${product.model.model_no}${
                            product.model.model_name || product.model.modelName
                              ? ` - ${product.model.model_name || product.model.modelName}`
                              : ''
                          }`
                        : product.model_id || '—'
                    }
                  />
                  <SpecRow
                    icon={<Calendar size={16} />}
                    label="Manufacturing Date (MFD)"
                    value={mfdDate}
                  />
                  <SpecRow
                    icon={<Warehouse size={16} />}
                    label="Warehouse"
                    value={
                      product.warehouse_name ||
                      product.warehouse?.warehouseName ||
                      product.warehouse?.warehouse_name ||
                      '—'
                    }
                  />
                  <SpecRow
                    icon={<Truck size={16} />}
                    label="Vendor"
                    value={
                      product.vendor_name ||
                      product.vendor?.name ||
                      product.vendor?.vendor_name ||
                      '—'
                    }
                  />
                  <SpecRow
                    icon={<Hash size={16} />}
                    label="Lot ID"
                    value={product.lot?.lotNumber || product.lot?.lot_number || '—'}
                    hasCopy
                    onCopy={() =>
                      handleCopy(product.lot?.lotNumber || product.lot?.lot_number || '', 'Lot ID')
                    }
                    copied={copiedField === 'Lot ID'}
                  />
                  <SpecRow
                    icon={<Hash size={16} />}
                    label="Serial Number"
                    value={product.serial_no}
                    hasCopy
                    onCopy={() => handleCopy(product.serial_no, 'Serial Number')}
                    copied={copiedField === 'Serial Number'}
                  />
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-4">
                    <FileText size={16} className="text-muted-foreground" /> Description
                  </h4>
                  <div className="bg-muted p-5 rounded-xl border border-border text-sm text-foreground whitespace-pre-wrap leading-relaxed shadow-inner">
                    {product.description}
                  </div>
                </div>
              )}

              {/* Key Features */}
              {displayFeatures && displayFeatures.length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                  <h4 className="text-xs font-bold text-success uppercase tracking-widest flex items-center gap-2 mb-4">
                    <List size={16} className="text-success" /> Key Features
                  </h4>
                  <div className="bg-success/10 p-5 rounded-xl border border-success/30 space-y-4">
                    {displayFeatures.map((f: ProductFeature, i: number) => (
                      <div key={i} className="group">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                          <p className="text-xs font-bold text-success uppercase tracking-wide">
                            {f.subHeading}
                          </p>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed pl-3.5">
                          {f.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Replacement Consumables */}
              {product.consumables && product.consumables.length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Layers size={16} className="text-muted-foreground" /> Replacement Consumables
                  </h4>
                  <div className="overflow-hidden border border-border/60 rounded-xl shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-muted text-muted-foreground border-b border-border">
                        <tr>
                          <th className="px-4 py-3 font-bold uppercase tracking-wider">
                            Part Number
                          </th>
                          <th className="px-4 py-3 font-bold uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-4 py-3 font-bold uppercase tracking-wider">Yield</th>
                          <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">
                            Price
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {product.consumables.map((c: ProductConsumable, i: number) => (
                          <tr key={i} className="hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-foreground">
                              {c.partName || '—'}
                            </td>
                            <td className="px-4 py-3 text-foreground">{c.description || '—'}</td>
                            <td className="px-4 py-3 text-foreground">{c.yield || '—'}</td>
                            <td className="px-4 py-3 font-bold text-primary text-right">
                              {formatCurrency(Number(c.price || 0), currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Image Preview Overlay Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground backdrop-blur-sm p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 p-2 text-primary-foreground hover:text-primary-foreground bg-card hover:bg-card rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <div className="relative w-full h-[80vh]">
              <Image
                src={previewImage}
                alt="Product Preview"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>
      )}
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
          <span className="text-sm font-semibold text-foreground mt-0.5">{value}</span>
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

function eventIcon(type: string) {
  switch (type) {
    case 'RECEIVED':
      return <Boxes size={16} className="text-success" />;
    case 'ALLOCATED':
      return <LogIn size={16} className="text-primary" />;
    case 'DEALLOCATED':
      return <LogOut size={16} className="text-muted-foreground" />;
    case 'REPLACED':
      return <RefreshCw size={16} className="text-warning" />;
    case 'SERVICE_TICKET':
      return <Wrench size={16} className="text-destructive" />;
    case 'USAGE_RECORD':
      return <TrendingUp size={16} className="text-lease" />;
    default:
      return <Info size={16} className="text-muted-foreground" />;
  }
}

function eventColor(type: string) {
  switch (type) {
    case 'RECEIVED':
      return 'border-success/30 bg-success/10';
    case 'ALLOCATED':
      return 'border-primary/30 bg-primary/10';
    case 'DEALLOCATED':
      return 'border-border bg-muted';
    case 'REPLACED':
      return 'border-warning/30 bg-warning/10';
    case 'SERVICE_TICKET':
      return 'border-destructive/30 bg-destructive/10';
    case 'USAGE_RECORD':
      return 'border-lease/30 bg-lease/10';
    default:
      return 'border-border bg-card';
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function EventCard({ event }: { event: HistoryEvent }) {
  const d = event.data;
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${eventColor(event.type)}`}>
      <div className="flex items-center gap-2 mb-2">
        {eventIcon(event.type)}
        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
          {event.type.replace('_', ' ')}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">{formatDate(event.timestamp)}</span>
      </div>
      <div className="text-xs text-foreground space-y-0.5">
        {event.type === 'RECEIVED' && (
          <>
            {d.lotNumber && (
              <p>
                Lot: <span className="font-semibold">{String(d.lotNumber)}</span>
              </p>
            )}
            {d.vendor && (
              <p>
                Vendor: <span className="font-semibold">{String(d.vendor)}</span>
              </p>
            )}
            {d.warehouse && (
              <p>
                Warehouse: <span className="font-semibold">{String(d.warehouse)}</span>
              </p>
            )}
          </>
        )}
        {(event.type === 'ALLOCATED' ||
          event.type === 'DEALLOCATED' ||
          event.type === 'REPLACED') && (
          <>
            {d.invoiceNumber && (
              <p>
                Contract: <span className="font-semibold">{String(d.invoiceNumber)}</span>
              </p>
            )}
            {d.billType && (
              <p>
                Type: <span className="font-semibold">{String(d.billType)}</span>
              </p>
            )}
            {d.reason && (
              <p>
                Reason: <span className="font-semibold">{String(d.reason)}</span>
              </p>
            )}
          </>
        )}
        {event.type === 'SERVICE_TICKET' && (
          <>
            <p>
              Ticket: <span className="font-semibold">{String(d.ticketNumber || '—')}</span>
            </p>
            <p>
              Issue: <span className="font-semibold">{String(d.issueDescription || '—')}</span>
            </p>
            <p>
              Status: <span className="font-semibold">{String(d.status || '—')}</span>
            </p>
            {d.completedAt && (
              <p>
                Completed:{' '}
                <span className="font-semibold">{formatDate(String(d.completedAt))}</span>
              </p>
            )}
          </>
        )}
        {event.type === 'USAGE_RECORD' && (
          <>
            <p>
              Period:{' '}
              <span className="font-semibold">
                {formatDate(String(d.billingPeriodStart))} —{' '}
                {formatDate(String(d.billingPeriodEnd))}
              </span>
            </p>
            <p>
              B&W copies:{' '}
              <span className="font-semibold">{Number(d.bwCopies || 0).toLocaleString()}</span>
            </p>
            {Number(d.colorCopies) > 0 && (
              <p>
                Colour copies:{' '}
                <span className="font-semibold">{Number(d.colorCopies).toLocaleString()}</span>
              </p>
            )}
            <p>
              Charge:{' '}
              <span className="font-semibold">
                {Number(d.totalCharge || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function LifecycleTab({
  history,
  loading,
  serialNumber,
  currency,
}: {
  history: ProductHistoryResponse | null;
  loading: boolean;
  serialNumber?: string | null;
  currency?: string;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading lifecycle history…</p>
      </div>
    );
  }

  if (!history) return null;

  const mh = history.machineHistory;

  return (
    <div className="space-y-6">
      {/* Summary card */}
      {mh && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Service Visits', value: mh.totalServiceVisits },
            { label: 'PM Visits', value: mh.totalPreventativeVisits },
            {
              label: 'Last Service',
              value: mh.lastServiceDate ? formatDate(mh.lastServiceDate) : '—',
            },
            {
              label: 'Parts Service Cost',
              value: Number(mh.totalPartsSpend).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              }),
            },
            {
              label: 'Labour Spend',
              value: Number(mh.totalLabourSpend).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              }),
            },
            {
              label: 'Lifetime Service Cost',
              value: Number(mh.totalLifetimeCost).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              }),
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl border border-border p-4 shadow-sm">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                {stat.label}
              </p>
              <p className="text-sm font-bold text-foreground">{String(stat.value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Real internal spend + per-ticket/toner breakdown — additive to the
          summary above, works for external machines too (keyed by serial). */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          Service & Spend Detail
        </h4>
        <MachineServiceAnalyticsPanel serialNumber={serialNumber} currency={currency} />
      </div>

      {/* Timeline */}
      {history.events.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No lifecycle events recorded yet.
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-muted" />
          <div className="space-y-4 pl-10">
            {history.events.map((event, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-6 top-4 w-4 h-4 rounded-full bg-card border-2 border-border flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>
                <EventCard event={event} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
