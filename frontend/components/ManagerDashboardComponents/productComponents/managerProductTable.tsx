'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, X, Trash2 } from 'lucide-react';
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

type Product = {
  id: string;
  name: string;
  Model: string;
  category: string;
  price: number;
  stock: number;
  status: 'in-stock' | 'out-of-stock';
  image?: string;
};

const initialProducts: Product[] = [
  {
    id: '1',
    name: 'HP LaserJet Pro',
    Model: 'HP-LJ-982345',
    category: 'Printer',
    price: 30000,
    stock: 12,
    status: 'in-stock',
    image: '',
  },
  {
    id: '2',
    name: 'Canon ImageCLASS',
    Model: 'CN-IMG-774521',
    category: 'Printer',
    price: 26000,
    stock: 8,
    status: 'in-stock',
    image: '',
  },
];

export default function ManagerProduct() {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const filtered = products.filter((p) =>
    `${p.name} ${p.Model} ${p.category}`.toLowerCase().includes(search.toLowerCase()),
  );

  const total = products.length;
  const inStock = products.filter((p) => p.status === 'in-stock').length;
  const outStock = products.filter((p) => p.status === 'out-of-stock').length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock < 5).length;

  const handleSave = (data: Product) => {
    setProducts((prev) =>
      editing ? prev.map((p) => (p.id === data.id ? data : p)) : [...prev, data],
    );
    setFormOpen(false);
    setEditing(null);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    setProducts((prev) => prev.filter((p) => p.id !== deleting.id));
    setDeleting(null);
  };

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8">
      <h3 className="text-xl sm:text-2xl font-bold text-blue-900">Products</h3>

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

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {['IMAGE', 'PRODUCT', 'Model', 'CATEGORY', 'PRICE', 'STOCK', 'STATUS', 'ACTION'].map(
                (h) => (
                  <TableHead key={h} className="text-[11px] font-semibold text-blue-900 px-4">
                    {h}
                  </TableHead>
                ),
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.map((p, i) => (
              <TableRow key={p.id} className={i % 2 ? 'bg-sky-100/60' : ''}>
                <TableCell className="px-4">
                  {p.image ? (
                    <div className="relative h-8 w-8 rounded overflow-hidden">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        className="object-cover"
                        unoptimized={p.image.startsWith('data:')}
                      />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                      N/A
                    </div>
                  )}
                </TableCell>
                <TableCell className="px-4 font-medium">{p.name}</TableCell>
                <TableCell className="px-4">{p.Model}</TableCell>
                <TableCell className="px-4">{p.category}</TableCell>
                <TableCell className="px-4">₹{p.price}</TableCell>
                <TableCell className="px-4">{p.stock}</TableCell>
                <TableCell className="px-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      p.status === 'in-stock'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {p.status}
                  </span>
                </TableCell>
                <TableCell className="px-4">
                  <div className="flex gap-3 text-sm">
                    <button
                      className="text-blue-900 hover:underline"
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
                </TableCell>
              </TableRow>
            ))}
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
  onConfirm: (data: Product) => void;
}) {
  const [form, setForm] = useState<Product>(
    initialData ?? {
      id: crypto.randomUUID(),
      name: '',
      Model: '',
      category: 'Printer',
      price: 0,
      stock: 0,
      status: 'in-stock',
      image: '',
    },
  );

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => setForm({ ...form, image: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <Modal title={initialData ? 'Update Product' : 'Add Product'} onClose={onClose}>
      <Field label="Product Image">
        <div className="flex items-center gap-4">
          {form.image ? (
            <div className="relative h-16 w-16 rounded overflow-hidden border">
              <Image
                src={form.image}
                alt="Product preview"
                fill
                className="object-cover"
                unoptimized={form.image.startsWith('data:')}
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

      <Field label="Product Name">
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>

      <Field label="SKU">
        <Input value={form.Model} onChange={(e) => setForm({ ...form, Model: e.target.value })} />
      </Field>

      <Field label="Category">
        <Input
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
      </Field>

      <Field label="Price">
        <Input
          type="number"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: +e.target.value })}
        />
      </Field>

      <Field label="Stock">
        <Input
          type="number"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: +e.target.value })}
        />
      </Field>

      <Field label="Status">
        <Select
          value={form.status}
          onValueChange={(v) => setForm({ ...form, status: v as Product['status'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in-stock">In Stock</SelectItem>
            <SelectItem value="out-of-stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button className="bg-primary text-white" onClick={() => onConfirm(form)}>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}
