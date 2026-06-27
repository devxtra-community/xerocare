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
} from 'lucide-react';
import Image from 'next/image';
import { getProductById, Product as BaseProduct } from '@/lib/product';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import Barcode from 'react-barcode';

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

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50/50 p-6 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-slate-500">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50/50 p-6 space-y-4">
        <p className="text-lg font-bold text-slate-800">Product not found</p>
        <Button onClick={() => router.back()} className="bg-primary hover:opacity-90 text-white">
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const mfdDate = product.MFD
    ? new Date(product.MFD).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

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
              <h3 className="text-lg sm:text-xl font-bold text-slate-800">{product.name}</h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  product.product_status === 'AVAILABLE'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : product.product_status === 'RENTED'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}
              >
                {product.product_status}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Model:{' '}
              {product.model
                ? `${product.model.model_no}${
                    product.model.model_name || product.model.modelName
                      ? ` - ${product.model.model_name || product.model.modelName}`
                      : ''
                  }`
                : product.model_id || '—'}
              <span className="mx-2 text-slate-300">•</span>
              Serial No: {product.serial_no}
            </p>
          </div>
        </div>
      </div>

      {/* DETAILED INFO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image, Price, Barcode */}
        <div className="lg:col-span-4 space-y-6">
          {/* Image Container */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col items-center">
            <div className="aspect-square relative w-full rounded-xl border border-slate-100 bg-slate-50/50 overflow-hidden flex items-center justify-center group">
              {product.imageUrl ? (
                <>
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-contain p-4"
                    unoptimized
                  />
                  <div
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    onClick={() => setPreviewImage(product.imageUrl || null)}
                  >
                    <Eye size={20} className="text-white" />
                  </div>
                </>
              ) : (
                <Package size={64} className="text-slate-300" />
              )}
            </div>
          </div>

          {/* Pricing Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
              Pricing Details
            </h4>
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
              <p className="text-[10px] font-semibold text-blue-600 tracking-wider uppercase mb-1">
                Selling Price
              </p>
              <p className="text-3xl font-extrabold text-blue-800">
                {formatCurrency(product.sale_price)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">
                  Wholesale Price
                </p>
                <p className="text-sm font-semibold text-slate-700">
                  {formatCurrency(product.wholesale_price || 0)}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Tax Rate</p>
                <p className="text-sm font-semibold text-slate-700">{product.tax_rate}%</p>
              </div>
            </div>
            {product.purchase_price && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">
                  Purchase Price
                </p>
                <p className="text-sm font-semibold text-slate-700">
                  {formatCurrency(product.purchase_price)}
                </p>
              </div>
            )}
          </div>

          {/* Barcode Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col items-center">
            <div className="flex justify-between items-center w-full mb-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Product Barcode
              </h4>
              <button
                onClick={() =>
                  handleCopy(product.barcode_id || `XC-P-${product.serial_no}`, 'Barcode ID')
                }
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
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6 pb-3 border-b border-slate-100">
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
                  product.vendor_name || product.vendor?.name || product.vendor?.vendor_name || '—'
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
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                <FileText size={16} className="text-slate-400" /> Description
              </h4>
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-inner">
                {product.description}
              </div>
            </div>
          )}

          {/* Key Features */}
          {product.features && product.features.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2 mb-4">
                <List size={16} className="text-emerald-500" /> Key Features
              </h4>
              <div className="bg-emerald-50/20 p-5 rounded-xl border border-emerald-100/50 space-y-4">
                {product.features.map((f: ProductFeature, i: number) => (
                  <div key={i} className="group">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                        {f.subHeading}
                      </p>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed pl-3.5">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Replacement Consumables */}
          {product.consumables && product.consumables.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                <Layers size={16} className="text-slate-400" /> Replacement Consumables
              </h4>
              <div className="overflow-hidden border border-slate-200/60 rounded-xl shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Part Number</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Yield</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {product.consumables.map((c: ProductConsumable, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {c.partName || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{c.description || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{c.yield || '—'}</td>
                        <td className="px-4 py-3 font-bold text-primary text-right">
                          {formatCurrency(Number(c.price || 0))}
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

      {/* Image Preview Overlay Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
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
    <div className="flex items-center justify-between py-3 border-b border-slate-100 hover:bg-slate-50/30 px-1 rounded transition-colors">
      <div className="flex items-center gap-3">
        <div className="text-slate-400">{icon}</div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {label}
          </span>
          <span className="text-sm font-semibold text-slate-700 mt-0.5">{value}</span>
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
