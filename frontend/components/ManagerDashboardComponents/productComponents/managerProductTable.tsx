'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, X, Eye, Copy, List, Info, FileText, Layers, Package } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { lotService, Lot, LotItem } from '@/lib/lot';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StatCard from '@/components/StatCard';
import { usePagination } from '@/hooks/usePagination';
import { StandardTable } from '@/components/table/StandardTable';
import { DeleteConfirmDialog } from '@/components/dialogs/DeleteConfirmDialog';
import { BulkProductDialog } from './BulkProductDialog';
import { productService, Product } from '@/services/productService';
import { modelService, Model } from '@/services/modelService';
import { commonService, Vendor, Warehouse } from '@/services/commonService';
import { getBrands, Brand } from '@/lib/brand';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import Barcode from 'react-barcode';

// Local interfaces removed in favor of imports from @/lib/lot

function ProductViewModal({ product, onClose }: { product: Product; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
          <div>
            <h2 className="text-xl font-medium text-slate-800">Product Details</h2>
            <p className="text-xs text-slate-500 font-normal uppercase tracking-wider mt-0.5">
              Ref: {product.serial_no}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Image & Basic Info */}
            <div className="lg:col-span-4 space-y-6">
              <div className="aspect-square relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-inner flex items-center justify-center">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-contain p-4"
                    unoptimized
                  />
                ) : (
                  <Package size={48} className="text-slate-300" />
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-[10px] font-medium text-blue-600 tracking-widest uppercase mb-1">
                    Sale Price
                  </p>
                  <p className="text-2xl font-semibold text-blue-800">
                    {formatCurrency(product.sale_price)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[9px] font-medium text-slate-400 uppercase mb-0.5">
                      Wholesale
                    </p>
                    <p className="text-sm font-normal text-slate-700">
                      {formatCurrency(product.wholesale_price || 0)}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[9px] font-medium text-slate-400 uppercase mb-0.5">
                      Tax Rate
                    </p>
                    <p className="text-sm font-normal text-slate-700">{product.tax_rate}%</p>
                  </div>
                </div>
              </div>

              {/* Barcode Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 self-start">
                  Product Barcode
                </p>
                <div className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-center w-full shadow-sm">
                  <Barcode
                    value={product.barcode_id || `XC-P-${product.serial_no}`}
                    width={1.5}
                    height={50}
                    fontSize={12}
                    margin={5}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Detailed Specs */}
            <div className="lg:col-span-8 space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
                  <Info size={18} className="text-primary" /> Specifications
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-500 font-normal">Product Name</span>
                    <span className="text-slate-800 font-normal">{product.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-500 font-normal">Brand</span>
                    <span className="text-slate-800 font-normal">{product.brand}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-500 font-normal">Model</span>
                    <span className="text-slate-800 font-normal">
                      {product.model?.model_no || product.model_id}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-500 font-normal">Serial No</span>
                    <span className="text-slate-800 font-mono text-[11px] font-normal">
                      {product.serial_no}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-500 font-normal">Warranty</span>
                    <span className="text-slate-800 font-normal">{product.warranty || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-500 font-normal">Print Colour</span>
                    <span className="text-slate-800 font-normal">{product.print_colour}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-500 font-normal">HS Code</span>
                    <span className="text-slate-800 font-mono text-[11px] font-normal">
                      {product.hs_code || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-500 font-normal">Lot ID</span>
                    <span className="text-slate-800 font-mono text-[11px] font-normal">
                      {product.lot?.lotNumber || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {product.description && (
                <div>
                  <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <FileText size={14} className="text-slate-400" /> Description
                  </h3>
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-sm">
                    {product.description}
                  </div>
                </div>
              )}

              {product.features && product.features.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-semibold text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <List size={14} className="text-emerald-500" /> Key Features
                  </h3>
                  <div className="bg-emerald-50/20 p-5 rounded-xl border border-emerald-100 shadow-sm space-y-4">
                    {product.features.map((f, i) => (
                      <div key={i} className="group">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <p className="text-[13px] font-semibold text-emerald-800 uppercase tracking-tight italic">
                            {f.subHeading}
                          </p>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed font-normal ml-3.5">
                          {f.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {product.consumables && product.consumables.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Layers size={14} className="text-slate-400" /> Replacement Consumables
                  </h3>
                  <div className="overflow-hidden border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2 font-semibold uppercase tracking-wider">Part</th>
                          <th className="px-4 py-2 font-semibold uppercase tracking-wider">Desc</th>
                          <th className="px-4 py-2 font-semibold uppercase tracking-wider">
                            Yield
                          </th>
                          <th className="px-4 py-2 font-semibold uppercase tracking-wider text-right">
                            Price
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {product.consumables.map((c, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2 font-normal text-slate-800">{c.partName}</td>
                            <td className="px-4 py-2 text-slate-600">{c.description}</td>
                            <td className="px-4 py-2 text-slate-600">{c.yield}</td>
                            <td className="px-4 py-2 font-normal text-primary text-right">
                              {formatCurrency(Number(c.price))}
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
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t flex justify-end">
          <Button onClick={onClose} className="px-8 font-bold">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Manager Product Management Page.
 * Main interface for managing inventory products.
 * Features listing, searching, filtering, adding (single/bulk), updating, and deleting products.
 * Displays key inventory stats like Total, Available, Rented, and Sold counts.
 */
export default function ManagerProduct() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [initialLotId, setInitialLotId] = useState<string | undefined>(undefined);
  const [initialItemId, setInitialItemId] = useState<string | undefined>(undefined);

  const { page, limit, total, setPage, setLimit, setTotal } = usePagination(10);
  const [stats, setStats] = useState({ total: 0, inStock: 0, rented: 0, sold: 0 });

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await productService.getAllProducts({ page, limit, search });
      setProducts(res.data);
      setTotal(res.total);

      // Total count from API, others remain naive based on current page
      setStats({
        total: res.total,
        inStock: res.data.filter((p) => p.product_status === 'AVAILABLE').length,
        rented: res.data.filter((p) => p.product_status === 'RENTED').length,
        sold: res.data.filter((p) => p.product_status === 'SOLD').length,
      });
    } catch {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, setTotal]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchProducts]);

  useEffect(() => {
    const lotId = searchParams.get('lotId');
    const itemId = searchParams.get('itemId');
    if (lotId) {
      setInitialLotId(lotId);
      setInitialItemId(itemId || undefined);
      setBulkDialogOpen(true);
    }
  }, [searchParams]);

  // Stats updated conditionally in fetchProducts

  const handleSave = async () => {
    setFormOpen(false);
    setEditing(null);
    fetchProducts(); // Refresh list
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await productService.deleteProduct(deleting.id);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch {
      toast.error('Failed to delete product');
    }
    setDeleting(null);
  };

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">Products</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard title="Total Inventory" value={stats.total.toString()} subtitle="All Items" />
        <StatCard title="Available" value={stats.inStock.toString()} subtitle="In Warehouse" />
        <StatCard title="Rented" value={stats.rented.toString()} subtitle="Active Rentals" />
        <StatCard title="Sold" value={stats.sold.toString()} subtitle="Total Sales" />
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, brand, serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div>
          <Button
            className="bg-primary text-white gap-2"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus size={16} /> Add Product
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white gap-2 ml-2"
            onClick={() => setBulkDialogOpen(true)}
          >
            <Plus size={16} /> Bulk Add
          </Button>
        </div>
      </div>

      <StandardTable
        columns={[
          {
            id: 'image',
            header: 'IMAGE',
            cell: (p: Product) =>
              p.imageUrl ? (
                <div className="relative h-8 w-8 rounded overflow-hidden group cursor-pointer">
                  <Image
                    src={p.imageUrl}
                    alt={p.name}
                    fill
                    className="object-cover"
                    unoptimized={true}
                  />
                  <div
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    onClick={() => setPreviewImage(p.imageUrl || null)}
                  >
                    <Eye size={14} className="text-white" />
                  </div>
                </div>
              ) : (
                <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                  N/A
                </div>
              ),
          },
          { id: 'name', header: 'PRODUCT', accessorKey: 'name' as keyof Product },
          { id: 'brand', header: 'BRAND', accessorKey: 'brand' as keyof Product },
          {
            id: 'lot',
            header: 'LOT ID',
            cell: (p: Product) => (
              <div className="flex items-center gap-2 group">
                <span className="font-mono text-[11px]">{p.lot?.lotNumber || '-'}</span>
                {p.lot?.lotNumber && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(p.lot?.lotNumber || '');
                      toast.success('Copied to clipboard');
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-primary"
                    title="Copy Lot ID"
                  >
                    <Copy size={12} />
                  </button>
                )}
              </div>
            ),
          },
          {
            id: 'serial',
            header: 'SERIAL NO',
            cell: (p: Product) => (
              <div className="flex items-center gap-2 group">
                <span className="font-mono text-[11px]">{p.serial_no || '-'}</span>
                {p.serial_no && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(p.serial_no);
                      toast.success('Copied to clipboard');
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-primary"
                    title="Copy Serial No"
                  >
                    <Copy size={12} />
                  </button>
                )}
              </div>
            ),
          },
          { id: 'price', header: 'PRICE', cell: (p: Product) => formatCurrency(p.sale_price) },
          {
            id: 'hs_code',
            header: 'HS CODE',
            cell: (p: Product) => <span className="font-mono text-[11px]">{p.hs_code || '-'}</span>,
          },
          {
            id: 'warranty',
            header: 'WARRANTY',
            cell: (p: Product) => {
              if (!p.warranty) return '-';
              const match = p.warranty.match(/^(\d+\s*(?:Year|Month|Yr|Mo)s?)/i);
              const display = match ? match[1] : p.warranty;
              return (
                <span className="text-[11px]" title={p.warranty}>
                  {display}
                </span>
              );
            },
          },
          { id: 'color', header: 'PRINT COLOUR', accessorKey: 'print_colour' as keyof Product },
          {
            id: 'status',
            header: 'STATUS',
            cell: (p: Product) => (
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  p.product_status === 'AVAILABLE'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {p.product_status}
              </span>
            ),
          },
          {
            id: 'actions',
            header: 'ACTION',
            cell: (p: Product) => (
              <div className="flex gap-3 text-sm">
                <button
                  className="text-blue-500 hover:text-blue-700 transition-colors"
                  onClick={() => setViewingProduct(p)}
                  title="View Details"
                >
                  <Eye size={18} />
                </button>
                <button
                  className="text-primary hover:underline"
                  onClick={() => {
                    setEditing(p);
                    setFormOpen(true);
                  }}
                >
                  Update
                </button>
                <button className="text-red-600 hover:underline" onClick={() => setDeleting(p)}>
                  Delete
                </button>
              </div>
            ),
          },
        ]}
        data={products}
        loading={loading}
        emptyMessage="No products found."
        keyExtractor={(p) => p.id}
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {viewingProduct && (
        <ProductViewModal product={viewingProduct} onClose={() => setViewingProduct(null)} />
      )}

      {formOpen && (
        <ProductFormModal
          initialData={editing}
          onClose={() => setFormOpen(false)}
          onConfirm={handleSave}
        />
      )}

      <DeleteConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete Product?"
        itemName={deleting?.name}
        onConfirm={confirmDelete}
      />

      <BulkProductDialog
        open={bulkDialogOpen}
        onClose={() => {
          setBulkDialogOpen(false);
          setInitialLotId(undefined);
          setInitialItemId(undefined);
        }}
        onSuccess={fetchProducts}
        initialLotId={initialLotId}
        initialItemId={initialItemId}
      />

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-transparent border-none shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          <div className="relative w-full aspect-square md:aspect-video flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg">
            {previewImage && (
              <Image
                src={previewImage}
                alt="Preview"
                fill
                className="object-contain"
                unoptimized={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductFormModal({
  initialData,
  onClose,
  onConfirm,
}: {
  initialData: Product | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  // Load dependencies
  const [models, setModels] = useState<Model[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);

  // Use string | number to allow empty string for better UX (prevent default 0 sticking)
  const [form, setForm] = useState<{
    name: string;
    brand: string;
    serial_no: string;
    model_id: string;
    vendor_id: string;
    warehouse_id: string;
    purchase_price: string | number;
    sale_price: string | number;
    tax_rate: string | number;
    MFD: string;
    product_status: string;
    imageUrl: string;
    print_colour: 'BLACK_WHITE' | 'COLOUR' | 'BOTH';
    max_discount_amount: string | number;
    wholesale_price: string | number;
    lot_id: string;
    description: string;
    hs_code: string;
    warranty: string;
    consumables: { partName: string; description: string; yield: string; price: string }[];
    features: { subHeading: string; description: string }[];
  }>({
    name: initialData?.name || '',
    brand: initialData?.brand || '',
    serial_no: initialData?.serial_no || '',
    model_id: initialData?.model_id || initialData?.model?.id || '',
    vendor_id: initialData?.vendor_id || initialData?.vendor?.id || '',
    warehouse_id: initialData?.warehouse_id || initialData?.warehouse?.id || '',
    purchase_price: initialData?.purchase_price ?? '',
    sale_price: initialData?.sale_price ?? '',
    tax_rate: initialData?.tax_rate ?? '',
    MFD: initialData?.MFD ? new Date(initialData.MFD).toISOString().split('T')[0] : '',
    product_status: initialData?.product_status || 'AVAILABLE',
    imageUrl: initialData?.imageUrl || '',
    print_colour: initialData?.print_colour || 'BLACK_WHITE',
    max_discount_amount: initialData?.max_discount_amount ?? '',
    wholesale_price: initialData?.wholesale_price ?? '',
    lot_id: initialData?.lot_id || '', // Check if initialData has lot_id support if needed
    description: initialData?.description || '',
    hs_code: initialData?.hs_code || '',
    warranty: initialData?.warranty || '',
    consumables: initialData?.consumables || [],
    features: initialData?.features || [{ subHeading: '', description: '' }],
  });

  // Derived state for filtering models
  // We need to find the brand ID corresponding to the current form.brand name if we are editing
  // However, form.brand is just a name.
  // Models have brandRelation { id, name }.
  // If editing, we might have initialData.model.brandRelation.id
  // Ideally we track selectedBrandId explicitly for the dropdown.
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedLotItemId, setSelectedLotItemId] = useState<string>('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(initialData?.imageUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadDependencies = async () => {
      const [mResult, vResult, wResult, bResult, lResult] = await Promise.allSettled([
        modelService.getAllModels(),
        commonService.getAllVendors(),
        commonService.getWarehousesByBranch(),
        getBrands(),
        lotService.getAllLots(),
      ]);

      if (mResult.status === 'fulfilled') setModels(mResult.value.data || []);
      else console.error('Failed to load models:', mResult.reason);

      if (vResult.status === 'fulfilled') setVendors(vResult.value);
      else console.error('Failed to load vendors:', vResult.reason);

      if (wResult.status === 'fulfilled') setWarehouses(wResult.value);
      else console.error('Failed to load warehouses:', wResult.reason);

      if (bResult.status === 'fulfilled' && bResult.value.success) setBrands(bResult.value.data);
      else if (bResult.status === 'rejected')
        console.error('Failed to load brands:', bResult.reason);

      if (lResult.status === 'fulfilled') setLots(lResult.value.data || []);
      else console.error('Failed to load lots:', lResult.reason);

      // Show a toast only if ALL critical dependencies failed
      const criticalFailed =
        mResult.status === 'rejected' &&
        vResult.status === 'rejected' &&
        wResult.status === 'rejected';
      if (criticalFailed) {
        toast.error('Failed to load form dependencies');
      }
    };
    loadDependencies();
  }, []);

  // Initialize selectedBrandId and selectedLotItemId when models and initialData are ready
  useEffect(() => {
    if (initialData && models.length > 0) {
      const relevantModel = models.find(
        (m) => m.id === (initialData.model_id || initialData.model?.id),
      );
      if (relevantModel?.brandRelation?.id) {
        setSelectedBrandId(relevantModel.brandRelation.id);
      } else if (initialData.brand) {
        // Fallback: try to find brand by name
        const brandByName = brands.find((b) => b.name === initialData.brand);
        if (brandByName) setSelectedBrandId(brandByName.id);
      }

      // If there's a lot_id, try to find the lot item and auto-fill the selection
      if (initialData.lot_id && lots.length > 0) {
        const lot = lots.find((l) => l.id === initialData.lot_id);
        const item = lot?.items?.find(
          (i: LotItem) =>
            i.itemType === 'MODEL' &&
            (i.modelId === initialData.model_id || i.model?.id === initialData.model_id),
        );
        if (item) {
          // Use item.id as the selection value (same as what the options use)
          setSelectedLotItemId(item.id || item.modelId || '');
        }
      }
    }
  }, [initialData, models, brands, lots]);

  // Filter models based on selectedBrandId
  const filteredModels = selectedBrandId
    ? models.filter((m) => {
        // console.log('Checking model:', m.model_name, m); // Debug
        return (
          m.brandRelation?.id === selectedBrandId ||
          m.brand?.id === selectedBrandId ||
          m.brand_id === selectedBrandId
        );
      })
    : [];

  const handleImageUpload = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview('');
    setForm({ ...form, imageUrl: '' });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return; // Prevent duplicate submissions

    // Frontend validation to prevent submitting missing required fields
    if (
      !form.name ||
      !form.brand ||
      !form.serial_no ||
      !form.model_id ||
      !form.vendor_id ||
      !form.warehouse_id ||
      !form.MFD ||
      form.sale_price === '' ||
      form.tax_rate === ''
    ) {
      toast.error('Please fill in all required fields including Vendor, Warehouse, and Model.');
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'consumables') {
          if (Array.isArray(value) && value.length > 0) {
            formData.append('consumables', JSON.stringify(value));
          }
        } else if (key === 'features') {
          if (Array.isArray(value) && value.length > 0) {
            formData.append('features', JSON.stringify(value));
          }
        } else if (value !== undefined && value !== null && (value !== '' || key === 'imageUrl')) {
          formData.append(key, value.toString());
        }
      });
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      if (initialData) {
        await productService.updateProduct(initialData.id, formData);
        toast.success('Product updated!');
      } else {
        await productService.createProduct(formData);
        toast.success('Product created!');
      }
      onConfirm();
    } catch {
      toast.error('Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={initialData ? 'Update Product' : 'Add Product'} onClose={onClose}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          <Field label="Brand">
            <SearchableSelect
              value={selectedBrandId}
              disabled={!!initialData}
              onValueChange={(v) => {
                setSelectedBrandId(v);
                const selectedBrand = brands.find((b) => b.id === v);
                setForm({
                  ...form,
                  brand: selectedBrand?.name || '',
                  model_id: '', // Reset model when brand changes
                });
              }}
              options={brands.map((b) => ({
                value: b.id,
                label: b.name,
                description: `ID: ${b.id}`,
              }))}
              placeholder="Select Brand"
              emptyText="No brands found."
            />
          </Field>

          <Field label="Model">
            <SearchableSelect
              value={form.model_id}
              disabled={!selectedBrandId || !!initialData}
              onValueChange={(v) => {
                setForm({
                  ...form,
                  model_id: v,
                });
              }}
              options={filteredModels.map((m) => ({
                value: m.id,
                label: `${m.model_no} - ${m.model_name}`,
                description: `ID: ${m.id}`,
              }))}
              placeholder={selectedBrandId ? 'Select Model' : 'Select Brand First'}
              emptyText="No models found."
            />
          </Field>

          <Field label="Product Name">
            <Input
              value={form.name}
              disabled={!!initialData}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter product name"
              required
            />
          </Field>

          <Field label="Serial Number">
            <Input
              value={form.serial_no}
              disabled={!!initialData}
              onChange={(e) => setForm({ ...form, serial_no: e.target.value })}
              placeholder="Enter serial number"
              required
            />
          </Field>
          <Field label="Description">
            <div className="flex flex-col gap-2">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Paste product description and features here"
                className="resize-y min-h-[300px] text-sm leading-relaxed whitespace-pre-wrap focus-visible:ring-0 focus-visible:ring-offset-0 border-slate-200 focus:border-slate-300"
                rows={12}
              />
            </div>
          </Field>

          <div className="pt-4 border-t mt-6">
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Replacement Consumables
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    consumables: [
                      ...prev.consumables,
                      { partName: '', description: '', yield: '', price: '' },
                    ],
                  }))
                }
                className="h-8 text-xs px-3 border-primary text-primary hover:bg-primary/5"
              >
                <Plus size={14} className="mr-1.5" /> Add Consumable
              </Button>
            </div>

            {form.consumables.map((consumable, idx) => (
              <div
                key={idx}
                className="bg-slate-50 p-4 rounded-lg mb-4 border border-slate-200 relative group shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => {
                    const newC = [...form.consumables];
                    newC.splice(idx, 1);
                    setForm({ ...form, consumables: newC });
                  }}
                  className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors p-1"
                >
                  <X size={16} />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="col-span-1">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase mb-1 block">
                      Part Name
                    </label>
                    <Input
                      value={consumable.partName}
                      onChange={(e) => {
                        const newC = [...form.consumables];
                        newC[idx].partName = e.target.value;
                        setForm({ ...form, consumables: newC });
                      }}
                      placeholder="e.g. C-EV 49 K"
                      className="h-9 focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase mb-1 block">
                      Description
                    </label>
                    <Input
                      value={consumable.description}
                      onChange={(e) => {
                        const newC = [...form.consumables];
                        newC[idx].description = e.target.value;
                        setForm({ ...form, consumables: newC });
                      }}
                      placeholder="e.g. Black Toner"
                      className="h-9 focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase mb-1 block">
                      Yield
                    </label>
                    <Input
                      value={consumable.yield}
                      onChange={(e) => {
                        const newC = [...form.consumables];
                        newC[idx].yield = e.target.value;
                        setForm({ ...form, consumables: newC });
                      }}
                      placeholder="e.g. 36000 pages @5%"
                      className="h-9 focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase mb-1 block">
                      Price
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={consumable.price}
                      onChange={(e) => {
                        const newC = [...form.consumables];
                        newC[idx].price = e.target.value;
                        setForm({ ...form, consumables: newC });
                      }}
                      placeholder="e.g. 390.00"
                      className="h-9 focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            ))}
            {form.consumables.length === 0 && (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                <p className="text-xs text-slate-400">No replacement consumables added yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <Field label="Date of Manufacture (MFD)">
            <Input
              type="date"
              value={form.MFD as string}
              disabled={!!initialData}
              onChange={(e) => setForm({ ...form, MFD: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Vendor">
              <SearchableSelect
                value={String(form.vendor_id)}
                disabled={!!initialData}
                onValueChange={(v) => setForm({ ...form, vendor_id: v })}
                options={vendors.map((v) => ({
                  value: String(v.id),
                  label: v.name,
                  description: `ID: ${v.id}`,
                }))}
                placeholder="Select Vendor"
                emptyText="No vendors found."
              />
            </Field>

            <Field label="Lot (Optional)">
              <SearchableSelect
                value={form.lot_id}
                onValueChange={(val) => {
                  const newLotId = val === 'none' ? '' : val;
                  setForm({ ...form, lot_id: newLotId });
                  setSelectedLotItemId(''); // Reset selection
                }}
                options={[
                  { value: 'none', label: 'None', description: 'Clear selection' },
                  ...lots.map((lot) => ({
                    value: lot.id,
                    label: lot.lotNumber,
                    description: lot.vendor?.name || 'Unknown Vendor',
                  })),
                ]}
                placeholder="Select Lot"
                emptyText="No lots found."
              />
            </Field>

            {form.lot_id && (
              <div className="col-span-2">
                <Field label="Select Product from Lot">
                  <SearchableSelect
                    value={selectedLotItemId}
                    onValueChange={(val) => {
                      setSelectedLotItemId(val);
                      const lot = lots.find((l) => l.id === form.lot_id);
                      const item = lot?.items?.find((i: LotItem) => {
                        return i.id === val || i.modelId === val || i.model?.id === val;
                      });

                      if (item) {
                        const modelId = item.modelId || item.model?.id || '';
                        const model = models.find((m) => m.id === modelId);
                        setSelectedBrandId(
                          model?.brandRelation?.id || model?.brand?.id || model?.brand_id || '',
                        );
                        setForm({
                          ...form,
                          model_id: modelId,
                          brand: model?.brandRelation?.name || model?.brand?.name || '',
                          vendor_id: lot?.vendorId || lot?.vendor?.id || form.vendor_id || '',
                        });
                      }
                    }}
                    options={(() => {
                      const lot = lots.find((l) => l.id === form.lot_id);
                      return (
                        lot?.items
                          ?.filter((i) => i.itemType === 'MODEL')
                          .map((i, idx) => {
                            const mId = i.modelId || i.model?.id;
                            const model = models.find((m) => m.id === mId);
                            const available = i.receivedQuantity - i.usedQuantity;
                            return {
                              value: i.id || mId || String(idx),
                              label: model
                                ? `${model.model_no} (${model.model_name})`
                                : 'Unknown Model',
                              description: `Available: ${available} / ${i.receivedQuantity}`,
                            };
                          }) || []
                      );
                    })()}
                    placeholder="Select Product"
                    emptyText="No products found in this lot."
                  />
                  {selectedLotItemId && (
                    <div className="text-xs mt-1">
                      {(() => {
                        const lot = lots.find((l) => l.id === form.lot_id);
                        const item = lot?.items?.find(
                          (i: LotItem) =>
                            i.id === selectedLotItemId ||
                            i.modelId === selectedLotItemId ||
                            i.model?.id === selectedLotItemId,
                        );
                        if (!item) return null;
                        const available = item.receivedQuantity - item.usedQuantity;
                        return (
                          <span
                            className={
                              available > 0
                                ? 'text-green-600 font-medium'
                                : 'text-red-500 font-bold'
                            }
                          >
                            {available > 0
                              ? `✓ Available in Lot: ${available} / ${item.receivedQuantity}`
                              : `✗ Out of Stock in Lot: ${available} / ${item.receivedQuantity}`}
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </Field>
              </div>
            )}
          </div>

          <Field label="Warehouse">
            <SearchableSelect
              value={form.warehouse_id}
              onValueChange={(v) => setForm({ ...form, warehouse_id: v })}
              options={warehouses.map((w) => ({
                value: w.id,
                label: w.warehouseName,
                description: `ID: ${w.id}`,
              }))}
              placeholder="Select Warehouse"
              emptyText="No warehouses found."
            />
          </Field>

          <div className="grid grid-cols-3 gap-2">
            <Field label="Purchase Price">
              <Input
                type="number"
                value={form.purchase_price}
                onChange={(e) => setForm({ ...form, purchase_price: Number(e.target.value) })}
                placeholder="0"
                required
              />
            </Field>
            <Field label="Sale Price">
              <Input
                type="number"
                value={form.sale_price}
                onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })}
                placeholder="0"
                required
              />
            </Field>
            <Field label="Tax Rate (%)">
              <Input
                type="number"
                value={form.tax_rate}
                onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })}
                placeholder="0"
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Max Discount">
              <Input
                type="number"
                value={form.max_discount_amount}
                onChange={(e) => setForm({ ...form, max_discount_amount: Number(e.target.value) })}
                placeholder="0"
              />
            </Field>
            <Field label="Wholesale Price">
              <Input
                type="number"
                value={form.wholesale_price}
                onChange={(e) => setForm({ ...form, wholesale_price: Number(e.target.value) })}
                placeholder="0"
              />
            </Field>
            <Field label="Print Colour">
              <Select
                value={form.print_colour}
                onValueChange={(v) =>
                  setForm({ ...form, print_colour: v as 'BLACK_WHITE' | 'COLOUR' | 'BOTH' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Colour" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BLACK_WHITE">Black & White</SelectItem>
                  <SelectItem value="COLOUR">Colour</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="HS Code">
              <Input
                value={form.hs_code || ''}
                onChange={(e) => setForm({ ...form, hs_code: e.target.value })}
                placeholder="HS Code"
              />
            </Field>
            <Field label="Warranty">
              <Input
                value={form.warranty || ''}
                onChange={(e) => setForm({ ...form, warranty: e.target.value })}
                placeholder="e.g. 1 Year"
              />
            </Field>
          </div>

          <div className="pt-4 border-t mt-6">
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Key Features
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    features: [...prev.features, { subHeading: '', description: '' }],
                  }))
                }
                className="h-8 text-xs px-3 border-emerald-600 text-emerald-600 hover:bg-emerald-50"
              >
                <Plus size={14} className="mr-1.5" /> Add Feature
              </Button>
            </div>

            {form.features.map((feature, idx) => (
              <div
                key={idx}
                className="bg-emerald-50/30 p-4 rounded-lg mb-4 border border-emerald-100 relative group shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => {
                    const newF = [...form.features];
                    newF.splice(idx, 1);
                    setForm({ ...form, features: newF });
                  }}
                  className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors p-1"
                >
                  <X size={16} />
                </button>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-emerald-700 uppercase mb-1 block">
                      Sub Heading
                    </label>
                    <Input
                      value={feature.subHeading}
                      onChange={(e) => {
                        const newF = [...form.features];
                        newF[idx].subHeading = e.target.value;
                        setForm({ ...form, features: newF });
                      }}
                      placeholder="e.g. Speed"
                      className="h-9 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-emerald-700 uppercase mb-1 block">
                      Description
                    </label>
                    <Textarea
                      value={feature.description}
                      onChange={(e) => {
                        const newF = [...form.features];
                        newF[idx].description = e.target.value;
                        setForm({ ...form, features: newF });
                      }}
                      placeholder="e.g. 30 ppm print speed for high productivity"
                      className="resize-none min-h-[60px] text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>
            ))}
            {form.features.length === 0 && (
              <div className="text-center py-6 border-2 border-dashed border-emerald-100 rounded-lg">
                <p className="text-xs text-emerald-400">No special features added yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Field label="Product Image">
          <div className="flex items-center gap-4">
            {imagePreview ? (
              <div className="relative h-16 w-16 rounded overflow-hidden border group">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  className="object-cover"
                  unoptimized={true}
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  title="Remove Image"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div className="h-16 w-16 rounded border flex items-center justify-center text-xs text-gray-400">
                No Image
              </div>
            )}
            <Input
              type="file"
              accept="image/*"
              key={imagePreview ? 'has-image' : 'no-image'}
              onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}
            />
          </div>
        </Field>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button className="bg-primary text-white" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Processing...' : 'Confirm'}
        </Button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}
