'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, X, Trash2, Settings } from 'lucide-react';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
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
import StatCard from '@/components/StatCard';
import { Product, getAllProducts, addProduct, updateProduct, deleteProduct, ProductStatus, CreateProductData } from '@/lib/product';
import { Model, getAllModels } from '@/lib/model';
import { toast } from 'sonner';
import { ModelManagementDialog } from './ModelManagementDialog';

export default function ManagerProduct() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [modelManagerOpen, setModelManagerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getAllProducts();
      setProducts(data);
    } catch {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filtered = products.filter((p) =>
    `${p.name} ${p.serial_no} ${p.brand}`.toLowerCase().includes(search.toLowerCase()),
  );

  const total = products.length;
  // TODO: Adjust status checks based on actual API values if needed
  const inStock = products.filter((p) => p.product_status === ProductStatus.AVAILABLE).length;
  const outStock = products.filter((p) => p.product_status !== ProductStatus.AVAILABLE).length;

  const handleSave = async () => {
    await fetchProducts();
    setFormOpen(false);
    setEditing(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteProduct(deleting.id);
      toast.success('Product deleted successfully');
      setProducts((prev) => prev.filter((p) => p.id !== deleting.id));
      setDeleting(null);
    } catch {
      toast.error('Failed to delete product');
    }
  };

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8">
      <h3 className="text-xl sm:text-2xl font-bold text-blue-900">Products</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard title="Total Products" value={total.toString()} subtitle="All items" />
        <StatCard title="Available" value={inStock.toString()} subtitle="Ready for rent" />
        <StatCard title="Unavailable" value={outStock.toString()} subtitle="Rented/Sold/Damaged" />
        <StatCard title="Total Value" value={`₹${products.reduce((acc, p) => acc + Number(p.sale_price), 0)}`} subtitle="Sale Price Sum" />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search product"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 bg-white text-blue-900 border-blue-200 hover:bg-blue-50"
            onClick={() => setModelManagerOpen(true)}
          >
            <Settings size={16} /> Manage Models
          </Button>

          <Button
            className="bg-primary text-white gap-2"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus size={16} /> Add Product
          </Button>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden border border-gray-100">
        <Table>
          <TableHeader>
            <TableRow>
              {['SERIAL NO', 'PRODUCT', 'MODEL', 'BRAND', 'SALE PRICE', 'RENT (M)', 'STATUS', 'ACTION'].map(
                (h) => (
                  <TableHead key={h} className="text-[11px] font-semibold text-blue-900 px-4">
                    {h}
                  </TableHead>
                ),
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  Loading products...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p, i) => (
                <TableRow key={p.id} className={i % 2 ? 'bg-sky-50/50' : ''}>
                  <TableCell className="px-4 font-mono text-xs">{p.serial_no}</TableCell>
                  <TableCell className="px-4 font-medium">{p.name}</TableCell>
                  <TableCell className="px-4 text-gray-600">
                    {p.model?.model_name || 'N/A'}
                  </TableCell>
                  <TableCell className="px-4 text-gray-600">{p.brand}</TableCell>
                  <TableCell className="px-4">₹{p.sale_price}</TableCell>
                  <TableCell className="px-4">₹{p.rent_price_monthly}</TableCell>
                  <TableCell className="px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${p.product_status === ProductStatus.AVAILABLE
                          ? 'bg-green-100 text-green-700'
                          : p.product_status === ProductStatus.RENTED
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                    >
                      {p.product_status}
                    </span>
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex gap-3 text-sm">
                      <button
                        className="text-blue-900 hover:text-blue-700 font-medium"
                        onClick={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800 font-medium"
                        onClick={() => setDeleting(p)}
                      >
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {formOpen && (
        <ProductFormModal
          initialData={editing}
          onClose={() => setFormOpen(false)}
          onSuccess={handleSave}
        />
      )}

      {modelManagerOpen && (
        <ModelManagementDialog
          onClose={() => setModelManagerOpen(false)}
          onModelChange={() => {
            fetchProducts();
          }}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          name={deleting.name}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function ProductFormModal({
  initialData,
  onClose,
  onSuccess,
}: {
  initialData: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Initialize form state
  const [form, setForm] = useState<Partial<CreateProductData>>({
    name: initialData?.name || '',
    brand: initialData?.brand || '',
    model_id: initialData?.model?.id || '',
    serial_no: initialData?.serial_no || '',
    vendor_id: initialData?.vendor_id || 1,
    sale_price: initialData?.sale_price || 0,
    rent_price_monthly: initialData?.rent_price_monthly || 0,
    rent_price_yearly: initialData?.rent_price_yearly || 0,
    lease_price_monthly: initialData?.lease_price_monthly || 0,
    lease_price_yearly: initialData?.lease_price_yearly || 0,
    tax_rate: initialData?.tax_rate || 0,
    product_status: initialData?.product_status || ProductStatus.AVAILABLE,
    MFD: initialData ? new Date(initialData.MFD).toISOString().split('T')[0] : '',
  });

  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoadingModels(true);
        const data = await getAllModels();
        setModels(data);
      } catch {
        toast.error('Failed to load models');
      } finally {
        setLoadingModels(false);
      }
    };
    loadModels();
  }, []);

  const handleSubmit = async () => {
    try {
      if (!form.name || !form.model_id || !form.serial_no) {
        toast.error('Please fill required fields (Name, Model, Serial No)');
        return;
      }

      const payload = { ...form } as CreateProductData;

      if (initialData) {
        await updateProduct(initialData.id, payload);
        toast.success('Product updated');
      } else {
        await addProduct(payload);
        toast.success('Product created');
      }
      onSuccess();
    } catch {
      toast.error('Failed to save product');
    }
  };

  return (
    <Modal title={initialData ? 'Update Product' : 'Add Product'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          <Field label="Product Name *">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Office Printer X1"
            />
          </Field>

          <Field label="Brand *">
            <Input
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              placeholder="e.g. HP"
            />
          </Field>

          <Field label="Model *">
            <Select
              value={form.model_id}
              onValueChange={(v) => setForm({ ...form, model_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingModels ? "Loading..." : "Select Model"} />
              </SelectTrigger>
              <SelectContent>
                {models.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.model_name} ({m.model_no})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Serial No *">
            <Input
              value={form.serial_no}
              onChange={(e) => setForm({ ...form, serial_no: e.target.value })}
              placeholder="Unique Serial No"
            />
          </Field>

          <Field label="Mfg Date">
            <Input
              type="date"
              value={form.MFD ? String(form.MFD) : ''}
              onChange={(e) => setForm({ ...form, MFD: e.target.value })}
            />
          </Field>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <Field label="Sale Price">
            <Input
              type="number"
              value={form.sale_price}
              onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Rent (Monthly)">
              <Input
                type="number"
                value={form.rent_price_monthly}
                onChange={(e) => setForm({ ...form, rent_price_monthly: Number(e.target.value) })}
              />
            </Field>
            <Field label="Rent (Yearly)">
              <Input
                type="number"
                value={form.rent_price_yearly}
                onChange={(e) => setForm({ ...form, rent_price_yearly: Number(e.target.value) })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Lease (Monthly)">
              <Input
                type="number"
                value={form.lease_price_monthly}
                onChange={(e) => setForm({ ...form, lease_price_monthly: Number(e.target.value) })}
              />
            </Field>
            <Field label="Lease (Yearly)">
              <Input
                type="number"
                value={form.lease_price_yearly}
                onChange={(e) => setForm({ ...form, lease_price_yearly: Number(e.target.value) })}
              />
            </Field>
          </div>

          <Field label="Tax Rate (%)">
            <Input
              type="number"
              value={form.tax_rate}
              onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })}
            />
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button className="bg-primary text-white" onClick={handleSubmit}>
          Confirm
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
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-6">
          <h2 className="font-semibold text-lg text-blue-900">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-1">{children}</div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 text-center max-w-sm w-full mx-4">
        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Trash2 className="text-red-600" size={24} />
        </div>
        <h3 className="text-lg font-semibold mb-2">Delete Product?</h3>
        <p className="text-gray-500 mb-6">
          Are you sure you want to delete <b>{name}</b>? This action cannot be undone.
        </p>
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={onCancel} className="w-full">
            Cancel
          </Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white w-full" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
