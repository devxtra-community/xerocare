'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { getProductById } from '@/lib/product';
import {
  Loader2,
  Package,
  X,
  ImageOff,
  CalendarDays,
  Tag,
  Barcode,
  Warehouse,
  Users,
  Box,
  Layers,
} from 'lucide-react';

// The backend returns nested model/vendor/lot/warehouse relations that aren't
// fully typed in the shared Product interface — extend here for the modal only.
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
    location?: string;
  };
  vendor?: {
    id: string;
    name?: string;
    company_name?: string;
  };
  lot?: {
    id: string;
    lotNumber?: string;
    lot_number?: string;
    purchaseDate?: string;
    purchase_date?: string;
    vendor?: { name?: string; company_name?: string };
  };
}

const statusColor: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  RENTED: 'bg-blue-100 text-blue-700',
  SOLD: 'bg-slate-100 text-slate-600',
  LEASE: 'bg-violet-100 text-violet-700',
  DAMAGED: 'bg-red-100 text-red-600',
  RETURNED: 'bg-amber-100 text-amber-700',
};

function Field({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | number | null;
  icon?: React.ElementType;
}) {
  if (value == null || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
        {Icon && <Icon size={9} />}
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
}

export function ProductDetailModal({ productId, open, onClose }: Props) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !productId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProduct(null);
    getProductById(productId)
      .then((p) => {
        if (!cancelled) setProduct(p as unknown as ProductDetail);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load product details.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, open]);

  const fmt = (n?: number | null) =>
    n != null
      ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : null;

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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
        <DialogTitle className="sr-only">Product Details</DialogTitle>

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X size={14} />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Package size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                Product Details
              </p>
              {product ? (
                <>
                  <p className="text-base font-black leading-tight truncate">{product.name}</p>
                  <p className="text-[11px] opacity-70 font-mono">{product.serial_no}</p>
                </>
              ) : (
                <p className="text-sm opacity-60">Loading…</p>
              )}
            </div>
          </div>
          {product && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span
                className={`text-[9px] font-black uppercase tracking-wider rounded-full px-2.5 py-0.5 ${statusColor[product.product_status] ?? 'bg-slate-100 text-slate-600'}`}
              >
                {product.product_status}
              </span>
              {product.ownership && (
                <span className="text-[9px] font-black uppercase tracking-wider bg-white/10 rounded-full px-2.5 py-0.5">
                  {product.ownership}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          )}
          {error && <p className="text-center text-sm text-red-500 py-8">{error}</p>}
          {product && !loading && (
            <div className="space-y-5">
              {/* Product image */}
              {product.imageUrl ? (
                <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50 h-44 flex items-center justify-center">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-slate-100 bg-slate-50 h-28 flex flex-col items-center justify-center gap-2 text-slate-300">
                  <ImageOff size={24} />
                  <span className="text-[10px] font-bold">No image</span>
                </div>
              )}

              {/* Identity */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Product Name" value={product.name} icon={Package} />
                <Field
                  label="Brand"
                  value={product.brand || product.model?.brand?.name}
                  icon={Tag}
                />
                <Field
                  label="Model"
                  value={product.model?.model_name || product.model?.modelName}
                  icon={Layers}
                />
                <Field label="Serial No." value={product.serial_no} icon={Barcode} />
                <Field label="Barcode ID" value={product.barcode_id} icon={Barcode} />
                <Field
                  label="Print Colour"
                  value={product.print_colour?.replace('_', ' ')}
                  icon={Package}
                />
              </div>

              <div className="border-t border-slate-100" />

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mfg. Date" value={fmtDate(product.MFD)} icon={CalendarDays} />
                <Field label="Warranty" value={product.warranty} icon={CalendarDays} />
                <Field
                  label="Warranty Start"
                  value={fmtDate(product.warranty_start_date)}
                  icon={CalendarDays}
                />
                <Field
                  label="Warranty End"
                  value={fmtDate(product.warranty_end_date)}
                  icon={CalendarDays}
                />
              </div>

              <div className="border-t border-slate-100" />

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sale Price" value={fmt(product.sale_price)} icon={Tag} />
                <Field label="Purchase Price" value={fmt(product.purchase_price)} icon={Tag} />
                <Field label="HS Code" value={product.hs_code} icon={Tag} />
                <Field label="Meter Reading" value={product.meter_reading ?? null} icon={Box} />
              </div>

              {/* Warehouse */}
              {product.warehouse && (
                <>
                  <div className="border-t border-slate-100" />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Warehouse" value={product.warehouse.name} icon={Warehouse} />
                    <Field label="Location" value={product.warehouse.location} icon={Warehouse} />
                  </div>
                </>
              )}

              {/* Vendor */}
              {product.vendor && (
                <>
                  <div className="border-t border-slate-100" />
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Vendor"
                      value={product.vendor.company_name || product.vendor.name}
                      icon={Users}
                    />
                    <Field label="Vendor ID" value={product.vendor.id} icon={Users} />
                  </div>
                </>
              )}

              {/* Lot */}
              {product.lot && (
                <>
                  <div className="border-t border-slate-100" />
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Lot Number"
                      value={product.lot.lotNumber || product.lot.lot_number}
                      icon={Box}
                    />
                    <Field
                      label="Lot Purchase Date"
                      value={fmtDate(product.lot.purchaseDate || product.lot.purchase_date)}
                      icon={CalendarDays}
                    />
                    {product.lot.vendor && (
                      <Field
                        label="Lot Vendor"
                        value={product.lot.vendor.company_name || product.lot.vendor.name}
                        icon={Users}
                      />
                    )}
                  </div>
                </>
              )}

              {/* Description */}
              {product.description && (
                <>
                  <div className="border-t border-slate-100" />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Description
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">{product.description}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
