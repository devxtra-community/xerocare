'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, X } from 'lucide-react';
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
import { getBrands, Brand } from '@/lib/brand';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Manager Model Management Page.
 * Lists all product models with search, add, update, and delete capabilities.
 * Displays total model count and allows managing model details like Name, Brand, and Description.
 */
export default function ManagerModel() {
  const [models, setModels] = useState<Model[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Model | null>(null);
  const [deleting, setDeleting] = useState<Model | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadModels = async () => {
    try {
      const res = await getAllModels();
      setModels(res.data || []);
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
      setDeleting(null);
    } catch (e: unknown) {
      // Check for 409 status code in error response
      const error = e as { response?: { status?: number; data?: { statusCode?: number } } };
      if (
        error.response &&
        (error.response.status === 409 || error.response.data?.statusCode === 409)
      ) {
        setDeleting(null); // Close confirmation dialog
        // Show error dialog
        setDeleteError(
          'This model cannot be deleted because it is associated with existing products. Please delete or reassign the products first.',
        );
      } else {
        toast.error('Failed to delete model');
        setDeleting(null);
      }
    }
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

      <div className="rounded-2xl bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                'MODEL NAME',
                'MODEL NO',
                'BRAND',
                'HS CODE',
                'TOTAL',
                'AVAILABLE',
                'RENTED',
                'LEASED',
                'SOLD',
                'ACTION',
              ].map((h) => (
                <TableHead
                  key={h}
                  className="text-[11px] font-semibold text-primary px-4 text-center"
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((m, i) => (
                <TableRow key={m.id} className={i % 2 ? 'bg-sky-100/60' : ''}>
                  <TableCell className="px-4 font-medium text-center">{m.model_name}</TableCell>
                  <TableCell className="px-4 text-center">{m.model_no}</TableCell>
                  <TableCell className="px-4 text-center">{m.brandRelation?.name || '-'}</TableCell>
                  <TableCell className="px-4 text-center">{m.hs_code || '-'}</TableCell>
                  <TableCell className="px-4 font-semibold text-blue-600 text-center">
                    {m.quantity}
                  </TableCell>
                  <TableCell className="px-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {m.available}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                      {m.rented}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      {m.leased}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {m.sold}
                    </span>
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex justify-center gap-3 text-sm">
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
                <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
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
        <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the model
                <span className="font-semibold text-foreground"> {deleting.model_name} </span>
                and remove it from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={(e) => {
                  e.preventDefault();
                  confirmDelete();
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AlertDialog open={!!deleteError} onOpenChange={(open) => !open && setDeleteError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Cannot Delete Model</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground">
              {deleteError}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDeleteError(null)}>Okay</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    brand_id: initialData?.brandRelation?.id || '',
    hs_code: initialData?.hs_code || '',
    description: initialData?.description || '',
  });
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    const fetchBrands = async () => {
      const res = await getBrands();
      if (res.success) {
        setBrands(res.data);
      }
    };
    fetchBrands();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand_id) {
      toast.error('Select a brand to add a model');
      return;
    }
    onConfirm(formData);
  };

  return (
    <Modal title={initialData ? 'Update Model' : 'Add Model'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Model Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.model_name}
              onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
              placeholder="e.g. HP LaserJet 1020"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Model No <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.model_no}
              onChange={(e) => setFormData({ ...formData, model_no: e.target.value })}
              placeholder="e.g. HP-LJ-1020"
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">
              Brand <span className="text-red-500">*</span>
            </label>
            <Select
              required
              value={formData.brand_id}
              onValueChange={(value) => setFormData({ ...formData, brand_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">HS Code</label>
            <Input
              value={formData.hs_code || ''}
              onChange={(e) => setFormData({ ...formData, hs_code: e.target.value })}
              placeholder="e.g. 84433100"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="A reliable laser printer suitable for small offices."
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
      <div className="bg-card rounded-2xl w-full max-w-2xl p-6">
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
