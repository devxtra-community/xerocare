'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, X, Trash2, Eye } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StatCard from '@/components/StatCard';
import { BulkProductDialog } from './BulkProductDialog';
import { productService, Product, CreateProductDTO } from '@/services/productService';
import { modelService, Model } from '@/services/modelService';
import { commonService, Vendor, Warehouse } from '@/services/commonService';
import { toast } from 'sonner';

export default function ManagerProduct() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getAllProducts();
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
    `${p.name} ${p.brand} ${p.serial_no}`.toLowerCase().includes(search.toLowerCase()),
  );

  const total = products.length;
  // Stats calculation based on available data
  const inStock = products.filter((p) => p.product_status === 'AVAILABLE').length;
  const rented = products.filter((p) => p.product_status === 'RENTED').length;
  const sold = products.filter((p) => p.product_status === 'SOLD').length;

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
        <StatCard title="Total Inventory" value={total.toString()} subtitle="All Items" />
        <StatCard title="Available" value={inStock.toString()} subtitle="In Warehouse" />
        <StatCard title="Rented" value={rented.toString()} subtitle="Active Rentals" />
        <StatCard title="Sold" value={sold.toString()} subtitle="Total Sales" />
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

      <div className="rounded-2xl bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                'IMAGE',
                'PRODUCT',
                'BRAND',
                'SERIAL NO',
                'PRICE',
                'PRINT COLOUR',
                'STATUS',
                'ACTION',
              ].map((h) => (
                <TableHead key={h} className="text-[11px] font-semibold text-primary px-4">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p, i) => (
                <TableRow key={p.id} className={i % 2 ? 'bg-sky-100/60' : ''}>
                  <TableCell className="px-4">
                    {p.imageUrl ? (
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
                    )}
                  </TableCell>
                  <TableCell className="px-4 font-medium">{p.name}</TableCell>
                  <TableCell className="px-4">{p.brand}</TableCell>
                  <TableCell className="px-4">{p.serial_no}</TableCell>
                  <TableCell className="px-4">₹{p.sale_price}</TableCell>
                  <TableCell className="px-4">{p.print_colour}</TableCell>
                  <TableCell className="px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        p.product_status === 'AVAILABLE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
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

      <BulkProductDialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        onSuccess={fetchProducts}
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

  const [form, setForm] = useState<Partial<CreateProductDTO>>({
    name: initialData?.name || '',
    brand: initialData?.brand || '',
    serial_no: initialData?.serial_no || '',
    model_id: initialData?.model_id || initialData?.model?.id || '',
    vendor_id: initialData?.vendor_id || initialData?.vendor?.id || '',
    warehouse_id: initialData?.warehouse_id || initialData?.warehouse?.id || '',
    sale_price: initialData?.sale_price ?? 0,
    tax_rate: initialData?.tax_rate ?? 0,
    MFD: initialData?.MFD ? new Date(initialData.MFD).toISOString().split('T')[0] : '',
    product_status: initialData?.product_status || 'AVAILABLE',
    imageUrl: initialData?.imageUrl || '',
    print_colour: initialData?.print_colour || 'BLACK_WHITE',
    max_discount_amount: initialData?.max_discount_amount || 0,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(initialData?.imageUrl || '');

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [m, v, w] = await Promise.all([
          modelService.getAllModels(),
          commonService.getAllVendors(),
          commonService.getWarehousesByBranch(),
        ]);
        setModels(m);
        setVendors(v);
        setWarehouses(w);
      } catch {
        toast.error('Failed to load form dependencies');
      }
    };
    loadDependencies();
  }, []);

  const handleImageUpload = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
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
    }
  };

  return (
    <Modal title={initialData ? 'Update Product' : 'Add Product'} onClose={onClose}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          <Field label="Product Name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter product name"
              required
            />
          </Field>

          <Field label="Brand">
            <Input
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              placeholder="Enter brand name"
              required
            />
          </Field>

          <Field label="Serial Number">
            <Input
              value={form.serial_no}
              onChange={(e) => setForm({ ...form, serial_no: e.target.value })}
              placeholder="Enter serial number"
              required
            />
          </Field>

          <Field label="Date of Manufacture (MFD)">
            <Input
              type="date"
              value={form.MFD as string}
              onChange={(e) => setForm({ ...form, MFD: e.target.value })}
            />
          </Field>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <Field label="Model">
            <Select value={form.model_id} onValueChange={(v) => setForm({ ...form, model_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.model_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Vendor">
            <Select
              value={String(form.vendor_id)}
              onValueChange={(v) => setForm({ ...form, vendor_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Warehouse">
            <Select
              value={form.warehouse_id}
              onValueChange={(v) => setForm({ ...form, warehouse_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.warehouseName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
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
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Field label="Product Image">
          <div className="flex items-center gap-4">
            {imagePreview ? (
              <div className="relative h-16 w-16 rounded overflow-hidden border">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  className="object-cover"
                  unoptimized={true}
                />
              </div>
            ) : (
              <div className="h-16 w-16 rounded border flex items-center justify-center text-xs text-gray-400">
                No Image
              </div>
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}
            />
          </div>
        </Field>
      </div>

      <div className="flex justify-end gap-3 mt-6">
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
      <div className="bg-card rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
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
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-[60]">
      <div className="bg-card rounded-2xl p-6 text-center shadow-xl">
        <Trash2 className="mx-auto text-red-600 mb-2 h-10 w-10" />
        <p className="text-lg">
          Delete <b>{name}</b>?
        </p>
        <p className="text-sm text-muted-foreground mb-4">This action cannot be undone.</p>
        <div className="flex justify-center gap-4">
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}
