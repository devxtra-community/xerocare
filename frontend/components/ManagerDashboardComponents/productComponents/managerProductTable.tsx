'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Eye, Copy } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { lotService } from '@/lib/lot';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StatCard from '@/components/StatCard';
import { usePagination } from '@/hooks/usePagination';
import { StandardTable } from '@/components/table/StandardTable';
import { DeleteConfirmDialog } from '@/components/dialogs/DeleteConfirmDialog';
import { BulkProductDialog } from './BulkProductDialog';
import { ProductFormModal } from '@/components/productComponents/ProductFormModal';
import { productService, Product } from '@/services/productService';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';

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
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
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

      if (itemId) {
        setFormOpen(true);
      } else {
        const checkLotProducts = async () => {
          try {
            const lot = await lotService.getLotById(lotId);
            const productItems = lot?.items?.filter((item) => item.itemType === 'MODEL') || [];

            if (productItems.length > 1) {
              setBulkDialogOpen(true);
            } else if (productItems.length === 1) {
              setInitialItemId(productItems[0].id);
              setFormOpen(true);
            } else {
              toast.error('No products found in this lot');
            }
          } catch (err) {
            console.error('Failed to fetch lot for routing:', err);
            setBulkDialogOpen(true);
          }
        };

        checkLotProducts();
      }
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
                  onClick={() => router.push(`/manager/products/${p.id}`)}
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

      {formOpen && (
        <ProductFormModal
          initialData={editing}
          initialLotId={initialLotId}
          initialItemId={initialItemId}
          onClose={() => {
            setFormOpen(false);
            setInitialLotId(undefined);
            setInitialItemId(undefined);
          }}
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
