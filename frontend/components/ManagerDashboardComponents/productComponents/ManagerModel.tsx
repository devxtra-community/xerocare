'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, X, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import StatCard from '@/components/StatCard';
import {
  Model,
  getAllModels,
  addModel,
  updateModel,
  deleteModel,
  CreateModelData,
  UpdateModelData,
} from '@/lib/model';
import { toast } from 'sonner';

export default function ManagerModel() {
  const [models, setModels] = useState<Model[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Model | null>(null);
  const [deleting, setDeleting] = useState<Model | null>(null);

  const loadModels = async () => {
    try {
      const data = await getAllModels();
      setModels(data);
    } catch (error) {
      console.error('Failed to load models:', error);
      toast.error('Failed to load models');
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const filtered = models.filter((m) =>
    `${m.model_name} ${m.model_no}`.toLowerCase().includes(search.toLowerCase()),
  );

  const total = models.length;

  const handleSave = async (data: CreateModelData | UpdateModelData) => {
    try {
      if (editing) {
        await updateModel(editing.id, data as UpdateModelData);
        toast.success('Model updated successfully');
      } else {
        await addModel(data as CreateModelData);
        toast.success('Model added successfully');
      }
      await loadModels();
      setFormOpen(false);
      setEditing(null);
    } catch (e) {
      console.error(e);
      toast.error(editing ? 'Failed to update model' : 'Failed to add model');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteModel(deleting.id);
      toast.success('Model deleted successfully');
      await loadModels();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete model');
    }
    setDeleting(null);
  };

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8">
      <h3 className="text-xl sm:text-2xl font-bold text-primary">Models</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard title="Total Models" value={total.toString()} subtitle="All models" />
        {/* Placeholder stats if needed, or just one card */}
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search model"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Button
            className="bg-primary text-white gap-2"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus size={16} /> Add Model
          </Button>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                'MODEL NAME',
                'MODEL NO',
                'WHOLESALE PRICE',
                'SALE PRICE',
                'RENT PRICE (M/Y)',
                'LEASE PRICE (M/Y)',
                'ACTION',
              ].map((h) => (
                <TableHead key={h} className="text-[11px] font-semibold text-primary px-4">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((m, i) => (
                <TableRow key={m.id} className={i % 2 ? 'bg-sky-100/60' : ''}>
                  <TableCell className="px-4 font-medium">{m.model_name}</TableCell>
                  <TableCell className="px-4">{m.model_no}</TableCell>
                  <TableCell className="px-4">₹{m.wholesale_price}</TableCell>
                  <TableCell className="px-4">₹{m.sale_price}</TableCell>
                  <TableCell className="px-4">
                    ₹{m.rent_price_monthly} / ₹{m.rent_price_yearly}
                  </TableCell>
                  <TableCell className="px-4">
                    ₹{m.lease_price_monthly} / ₹{m.lease_price_yearly}
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex gap-3 text-sm">
                      <button
                        className="text-primary hover:underline flex items-center gap-1"
                        onClick={() => {
                          setEditing(m);
                          setFormOpen(true);
                        }}
                      >
                        Update
                      </button>
                      <button
                        className="text-red-600 hover:underline flex items-center gap-1"
                        onClick={() => setDeleting(m)}
                      >
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                  No models found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {formOpen && (
        <ModelFormModal
          initialData={editing}
          onClose={() => setFormOpen(false)}
          onConfirm={handleSave}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          name={deleting.model_name}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function ModelFormModal({
  initialData,
  onClose,
  onConfirm,
}: {
  initialData: Model | null;
  onClose: () => void;
  onConfirm: (data: CreateModelData | UpdateModelData) => void;
}) {
  const [formData, setFormData] = useState<CreateModelData>({
    model_name: initialData?.model_name || '',
    model_no: initialData?.model_no || '',
    brand: initialData?.brand || '',
    description: initialData?.description || '',
    rent_price_monthly: initialData?.rent_price_monthly || 0,
    rent_price_yearly: initialData?.rent_price_yearly || 0,
    lease_price_monthly: initialData?.lease_price_monthly || 0,
    lease_price_yearly: initialData?.lease_price_yearly || 0,
    sale_price: initialData?.sale_price || 0,
    wholesale_price: initialData?.wholesale_price || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(formData);
  };

  return (
    <Modal title={initialData ? 'Update Model' : 'Add Model'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Model Name</label>
            <Input
              value={formData.model_name}
              onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
              placeholder="e.g. HP LaserJet 1020"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Model No</label>
            <Input
              value={formData.model_no}
              onChange={(e) => setFormData({ ...formData, model_no: e.target.value })}
              placeholder="e.g. HP-LJ-1020"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Brand</label>
            <Input
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="e.g. HP"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Scale Price (₹)</label>
            <Input
              type="number"
              value={formData.sale_price}
              onChange={(e) => setFormData({ ...formData, sale_price: Number(e.target.value) })}
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Wholesale Price (₹)</label>
            <Input
              type="number"
              value={formData.wholesale_price}
              onChange={(e) =>
                setFormData({ ...formData, wholesale_price: Number(e.target.value) })
              }
              min={0}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Rent (Monthly)</label>
            <Input
              type="number"
              value={formData.rent_price_monthly}
              onChange={(e) =>
                setFormData({ ...formData, rent_price_monthly: Number(e.target.value) })
              }
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rent (Yearly)</label>
            <Input
              type="number"
              value={formData.rent_price_yearly}
              onChange={(e) =>
                setFormData({ ...formData, rent_price_yearly: Number(e.target.value) })
              }
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Lease (Monthly)</label>
            <Input
              type="number"
              value={formData.lease_price_monthly}
              onChange={(e) =>
                setFormData({ ...formData, lease_price_monthly: Number(e.target.value) })
              }
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Lease (Yearly)</label>
            <Input
              type="number"
              value={formData.lease_price_yearly}
              onChange={(e) =>
                setFormData({ ...formData, lease_price_yearly: Number(e.target.value) })
              }
              min={0}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
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
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
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
