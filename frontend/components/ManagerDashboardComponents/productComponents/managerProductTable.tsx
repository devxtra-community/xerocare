'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, X, Trash2, Upload } from 'lucide-react';
import Image from 'next/image';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import StatCard from '@/components/StatCard';

// Product type imported from lib
import {
  Product,
  getAllProducts,
  deleteProduct,
  addProduct,
  updateProduct,
  CreateProductData,
  UpdateProductData,
  ProductStatus,
} from '@/lib/product';
import { BulkUploadModal } from './BulkUploadModal';

// Initial data removed

export default function ManagerProduct() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const loadProducts = async () => {
    try {
      const data = await getAllProducts();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  // Fetch products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = products.filter((p) =>
    `${p.name} ${p.model?.model_name || ''} ${p.brand}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const total = products.length;
  // Calculate total stock from inventory array
  const getTotalStock = (p: Product) =>
    p.inventory?.reduce((sum, inv) => sum + inv.quantity, 0) || 0;

  const inStock = products.filter((p) => p.product_status === ProductStatus.AVAILABLE).length;
  // Use status for simplicity, or we could calculate based on getTotalStock(p) === 0
  const outStock = products.filter((p) => p.product_status !== ProductStatus.AVAILABLE).length;
  // Low stock could be < 5
  const lowStock = products.filter((p) => {
    const stock = getTotalStock(p);
    return stock > 0 && stock < 5;
  }).length;

  const handleSave = async (data: CreateProductData | UpdateProductData) => {
    try {
      if (editing) {
        await updateProduct(editing.id, data as UpdateProductData);
      } else {
        await addProduct(data as CreateProductData);
      }
      await loadProducts();
      setFormOpen(false);
      setEditing(null);
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteProduct(deleting.id);
      await loadProducts();
    } catch (e) {
      console.error(e);
    }
    setDeleting(null);
  };

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8">
      <h3 className="text-xl sm:text-2xl font-bold text-primary">Products</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard title="Total Products" value={total.toString()} subtitle="All items" />
        <StatCard title="In Stock" value={inStock.toString()} subtitle="Available" />
        <StatCard title="Out of Stock" value={outStock.toString()} subtitle="Unavailable" />
        <StatCard title="Low Stock" value={lowStock.toString()} subtitle="Below 5 qty" />
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search product"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setUploadOpen(true)}>
            <Upload size={16} /> Bulk Upload
          </Button>
          <Button
            className="bg-primary text-white gap-2"
            onClick={() => {
              setEditing(null); // Ensure editing is null for Add mode
              setFormOpen(true);
            }}
          >
            <Plus size={16} /> Add Product
          </Button>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {['IMAGE', 'PRODUCT', 'Model', 'CATEGORY', 'PRICE', 'STOCK', 'STATUS', 'ACTION'].map(
                (h) => (
                  <TableHead key={h} className="text-[11px] font-semibold text-primary px-4">
                    {h}
                  </TableHead>
                ),
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((p, i) => (
                <TableRow key={p.id} className={i % 2 ? 'bg-sky-100/60' : ''}>
                  <TableCell className="px-4">
                    {p.imageUrl ? (
                      <div className="relative h-8 w-8 rounded overflow-hidden">
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          fill
                          className="object-cover"
                          unoptimized={p.imageUrl.startsWith('data:')}
                        />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                        N/A
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-4 font-medium">{p.name}</TableCell>
                  <TableCell className="px-4">{p.model?.model_name || '-'}</TableCell>
                  <TableCell className="px-4">{p.brand}</TableCell>
                  <TableCell className="px-4">₹{p.sale_price}</TableCell>
                  <TableCell className="px-4">{getTotalStock(p)}</TableCell>
                  <TableCell className="px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        p.product_status === ProductStatus.AVAILABLE
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {p.product_status}
                    </span>
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex gap-3 text-sm">
                      <button
                        className="text-primary hover:underline"
                        onClick={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                      >
                        Update
                      </button>
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => setDeleting(p)}
                      >
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                  No products found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {formOpen && (
        <ProductFormModal
          initialData={editing}
          onClose={() => setFormOpen(false)}
          onConfirm={handleSave}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          name={deleting.name}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}

      {uploadOpen && (
        <BulkUploadModal
          onClose={() => setUploadOpen(false)}
          onSuccess={() => {
            loadProducts();
            setUploadOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ProductFormModal({
  initialData,
  onClose,
}: {
  initialData: Product | null;
  onClose: () => void;

  onConfirm: (data: CreateProductData | UpdateProductData) => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [form, setForm] = useState<Partial<CreateProductData & UpdateProductData>>({
    name: initialData?.name || '',
    brand: initialData?.brand || '',
    sale_price: initialData?.sale_price || 0,
    product_status: initialData?.product_status || ProductStatus.AVAILABLE,
    model_id: initialData?.model?.id || '',
    // Add other fields as necessary for the form to work nicely
  });

  return (
    <Modal title={initialData ? 'Update Product' : 'Add Product'} onClose={onClose}>
      <div className="p-4 space-y-4">
        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md text-sm">
          Form update is pending. Please use the backend API directly or wait for the form
          implementation update.
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex justify-between mb-4">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  name,
  onCancel,
  onConfirm,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 text-center">
        <Trash2 className="mx-auto text-red-600 mb-2" />
        <p>
          Delete <b>{name}</b>?
        </p>
        <div className="flex justify-center gap-4 mt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="bg-red-600 text-white" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// function Field({ label, children }: { label: string; children: React.ReactNode }) {
//   return (
//     <div>
//       <label className="block text-sm font-medium mb-1">{label}</label>
//       {children}
//     </div>
//   );
// }
