'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  getProductById,
  getAllProducts,
  getProductMeterReadings,
  type MeterReadingEntry,
} from '@/lib/product';
import { meterSourceLabel } from '@/lib/machineAllocations';
import { getServiceContracts, ServiceContract } from '@/lib/serviceContract';
import { resolveImageUrl } from '@/lib/imageUrl';
import { getActiveCurrency } from '@/lib/currency';
import {
  Loader2,
  Package,
  X,
  ImageOff,
  CalendarDays,
  Warehouse,
  Users,
  Hash,
  CheckCircle2,
  FileText,
  Gauge,
} from 'lucide-react';

interface ProductDetail {
  id: string;
  name: string;
  serial_no: string;
  brand: string;
  MFD?: string;
  sale_price?: number;
  purchase_price?: number;
  imageUrl?: string | null;
  description?: string;
  product_status: string;
  print_colour?: string;
  warranty?: string;
  warranty_start_date?: string;
  warranty_end_date?: string;
  barcode_id?: string;
  hs_code?: string;
  meter_reading?: number;
  meter_reading_at?: string | null;
  meter_reading_source?: string | null;
  ownership?: string;
  model?: {
    id: string;
    model_name?: string;
    modelName?: string;
    brand?: { name?: string };
  };
  warehouse?: {
    id: string;
    name?: string;
    warehouseName?: string;
    location?: string;
    address?: string;
    capacity?: string;
  };
  vendor?: {
    id: string;
    name?: string;
    company_name?: string;
    phone?: string;
    email?: string;
    contactPerson?: string;
  };
  lot?: {
    id: string;
    lotNumber?: string;
    lot_number?: string;
    purchaseDate?: string;
    purchase_date?: string;
    vendor?: { name?: string; company_name?: string; phone?: string };
  };
}

const statusConfig: Record<string, { color: string; bg: string; dot: string }> = {
  AVAILABLE: {
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  RENTED: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  SOLD: { color: 'text-slate-600', bg: 'bg-slate-100 border-slate-200', dot: 'bg-slate-400' },
  LEASE: { color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', dot: 'bg-violet-500' },
  DAMAGED: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  RETURNED: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
};

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-5 w-5 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Icon size={11} className="text-slate-500" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <span className="text-xs font-semibold text-slate-800 break-words">{value}</span>
    </div>
  );
}

interface Props {
  productId: string | null;
  open: boolean;
  onClose: () => void;
  /** Service Desk doesn't need vendor contact info (name/contact person/phone/email)
   * surfaced here — it's purchasing/inventory data, not relevant to servicing a
   * customer's contract. Other callers (inventory/purchasing views) leave this off. */
  hideVendorDetails?: boolean;
  /** Service Technicians additionally don't need lot/purchasing info either. */
}

export function ProductDetailModal({ productId, open, onClose, hideVendorDetails = false }: Props) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableQty, setAvailableQty] = useState<number | null>(null);
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [meterReadings, setMeterReadings] = useState<MeterReadingEntry[]>([]);

  useEffect(() => {
    if (!open || !productId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProduct(null);
    setAvailableQty(null);

    getProductById(productId)
      .then(async (p) => {
        if (cancelled) return;
        const detail = p as unknown as ProductDetail;
        setProduct(detail);

        // Fetch available count for this model in the branch
        if (detail.model?.id) {
          try {
            const available = await getAllProducts({
              modelId: detail.model.id,
              status: 'AVAILABLE',
              limit: 1000,
            });
            if (!cancelled) setAvailableQty(available.length);
          } catch {
            if (!cancelled) setAvailableQty(null);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load product details.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Every AMC/SMA/FSMA agreement this machine has ever been under — current
    // and expired/cancelled — regardless of which branch or customer it was
    // under at the time. Silently empty for machines that never had one.
    setContractsLoading(true);
    setContracts([]);
    getServiceContracts({ productId })
      .then((list) => {
        if (!cancelled) setContracts(list);
      })
      .catch(() => {
        if (!cancelled) setContracts([]);
      })
      .finally(() => {
        if (!cancelled) setContractsLoading(false);
      });

    // Every reading of this machine, whichever flow took it.
    setMeterReadings([]);
    getProductMeterReadings(productId)
      .then((rows) => {
        if (!cancelled) setMeterReadings(rows.slice(0, 10));
      })
      .catch(() => {
        if (!cancelled) setMeterReadings([]);
      });

    return () => {
      cancelled = true;
    };
  }, [productId, open]);

  const fmtDate = (d?: string | null) => {
    if (!d) return null;
    try {
      return new Date(d).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return d;
    }
  };

  const status = product ? (statusConfig[product.product_status] ?? statusConfig.SOLD) : null;
  const warehouseName = product?.warehouse?.warehouseName || product?.warehouse?.name;
  const vendorName = product?.vendor?.company_name || product?.vendor?.name;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-lg rounded-2xl p-0 overflow-hidden border border-slate-200 shadow-2xl"
      >
        <DialogTitle className="sr-only">Product Details</DialogTitle>

        {/* ── White header ── */}
        <div className="bg-white border-b border-slate-100 px-5 pt-5 pb-4 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X size={13} className="text-slate-500" />
          </button>

          <div className="flex items-center gap-3 pr-8">
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Package size={18} className="text-slate-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                Product Details
              </p>
              {product ? (
                <>
                  <p className="text-base font-black text-slate-800 leading-tight truncate">
                    {product.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{product.serial_no}</p>
                </>
              ) : (
                <p className="text-sm text-slate-400">Loading…</p>
              )}
            </div>
          </div>

          {product && status && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider rounded-full px-2.5 py-1 border ${status.bg} ${status.color}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {product.product_status}
              </span>
              {product.ownership && (
                <span className="text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 rounded-full px-2.5 py-1 border border-slate-200">
                  {product.ownership}
                </span>
              )}
              {availableQty !== null && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-1 border border-emerald-200">
                  <CheckCircle2 size={9} />
                  {availableQty} Available
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="p-5 max-h-[68vh] overflow-y-auto space-y-5 bg-slate-50/40">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          )}
          {error && <p className="text-center text-sm text-red-500 py-8">{error}</p>}

          {product && !loading && (
            <>
              {/* Product image */}
              {product.imageUrl ? (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-white h-44 flex items-center justify-center">
                  <img
                    src={resolveImageUrl(product.imageUrl)}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white h-24 flex flex-col items-center justify-center gap-2 text-slate-300">
                  <ImageOff size={20} />
                  <span className="text-[10px] font-bold">No image</span>
                </div>
              )}

              {/* ── Product Identity ── */}
              <div className="bg-white rounded-xl border border-slate-100 p-4">
                <SectionLabel icon={Package} label="Product Identity" />
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field label="Product Name" value={product.name} />
                  <Field label="Brand" value={product.brand || product.model?.brand?.name} />
                  <Field
                    label="Model"
                    value={product.model?.model_name || product.model?.modelName}
                  />
                  <Field label="Serial No." value={product.serial_no} />
                  <Field label="Barcode ID" value={product.barcode_id} />
                  <Field label="Print Colour" value={product.print_colour?.replace(/_/g, ' ')} />
                  <Field
                    label="Meter Reading"
                    value={
                      product.meter_reading != null
                        ? Number(product.meter_reading).toLocaleString()
                        : null
                    }
                  />
                  <Field
                    label="Reading Taken"
                    value={
                      [
                        meterSourceLabel(product.meter_reading_source),
                        fmtDate(product.meter_reading_at),
                      ]
                        .filter(Boolean)
                        .join(' · ') || null
                    }
                  />
                </div>
              </div>

              {/* ── Dates & Warranty ── */}
              {(product.MFD ||
                product.warranty ||
                product.warranty_start_date ||
                product.warranty_end_date) && (
                <div className="bg-white rounded-xl border border-slate-100 p-4">
                  <SectionLabel icon={CalendarDays} label="Dates & Warranty" />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Field label="Mfg. Date" value={fmtDate(product.MFD)} />
                    <Field label="Warranty" value={product.warranty} />
                    <Field label="Warranty Start" value={fmtDate(product.warranty_start_date)} />
                    <Field label="Warranty End" value={fmtDate(product.warranty_end_date)} />
                  </div>
                </div>
              )}

              {/* ── Warehouse Details ── */}
              {product.warehouse && (
                <div className="bg-white rounded-xl border border-slate-100 p-4">
                  <SectionLabel icon={Warehouse} label="Warehouse Details" />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Field label="Warehouse Name" value={warehouseName} />
                    <Field label="Location" value={product.warehouse.location} />
                    <Field label="Address" value={product.warehouse.address} />
                    <Field label="Capacity" value={product.warehouse.capacity} />
                    {availableQty !== null && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          Available Quantity
                        </span>
                        <span className="text-xs font-black text-emerald-600">
                          {availableQty} unit{availableQty !== 1 ? 's' : ''} in stock
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Vendor Details ── */}
              {!hideVendorDetails && product.vendor && vendorName && (
                <div className="bg-white rounded-xl border border-slate-100 p-4">
                  <SectionLabel icon={Users} label="Vendor Details" />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Field label="Vendor Name" value={vendorName} />
                    <Field label="Contact Person" value={product.vendor.contactPerson} />
                    <Field label="Phone" value={product.vendor.phone} />
                    <Field label="Email" value={product.vendor.email} />
                  </div>
                </div>
              )}

              {/* ── Service Agreement History ── */}
              {/* ── Meter Reading History ── one shared reading per machine, fed by
                  service tickets/contracts and Rent/Lease installation, usage and
                  replacement alike. */}
              {meterReadings.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 p-4">
                  <SectionLabel icon={Gauge} label="Meter Reading History" />
                  <div className="divide-y divide-slate-100">
                    {meterReadings.map((r) => (
                      <div key={r.id} className="flex items-center justify-between py-1.5 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-700">
                            {meterSourceLabel(r.source) ?? r.source}
                            {r.referenceNo && (
                              <span className="font-normal text-slate-400"> · {r.referenceNo}</span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400">{fmtDate(r.readingDate)}</p>
                        </div>
                        <span className="shrink-0 font-bold tabular-nums text-slate-800">
                          {Number(r.totalReading).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(contractsLoading || contracts.length > 0) && (
                <div className="bg-white rounded-xl border border-slate-100 p-4">
                  <SectionLabel icon={FileText} label="Service Agreement History" />
                  {contractsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 size={16} className="animate-spin text-slate-400" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contracts.map((c) => {
                        const isCurrent = c.status === 'ACTIVE';
                        return (
                          <div
                            key={c.id}
                            className={`rounded-lg border p-3 ${
                              isCurrent
                                ? 'border-emerald-200 bg-emerald-50/50'
                                : 'border-slate-100 bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100 rounded px-1.5 py-0.5">
                                  {c.contractType}
                                </span>
                                <span
                                  className={`text-[9px] font-black uppercase tracking-wider rounded px-1.5 py-0.5 border ${
                                    isCurrent
                                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-100 text-slate-500 border-slate-200'
                                  }`}
                                >
                                  {c.status}
                                </span>
                                {(c.customer?.firstName || c.customer?.lastName) && (
                                  <span className="text-[10px] text-slate-500 font-semibold truncate">
                                    {[c.customer?.firstName, c.customer?.lastName]
                                      .filter(Boolean)
                                      .join(' ')}
                                  </span>
                                )}
                              </div>
                              {c.contractType !== 'FSMA' && (
                                <span className="text-xs font-black text-slate-700">
                                  {getActiveCurrency()} {Number(c.contractValue).toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5 text-[10px] text-slate-400 font-semibold">
                              {fmtDate(c.startDate)} → {fmtDate(c.endDate)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Description ── */}
              {product.description && (
                <div className="bg-white rounded-xl border border-slate-100 p-4">
                  <SectionLabel icon={Hash} label="Description" />
                  <p className="text-xs text-slate-600 leading-relaxed">{product.description}</p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
