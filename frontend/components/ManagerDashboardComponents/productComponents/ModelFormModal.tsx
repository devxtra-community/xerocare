'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Model, CreateModelData, UpdateModelData } from '@/lib/model';
import { getBrands, Brand } from '@/lib/brand';
import { toast } from 'sonner';

/**
 * Model create/edit dialog — the same component used on the Models management
 * page. Pass `initialData` to switch into edit mode; the caller (not this
 * component) is responsible for persisting via `onConfirm`.
 */
export function ModelFormModal({
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
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">
              Brand <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={brands.map((brand) => ({
                value: brand.id,
                label: brand.name,
              }))}
              value={formData.brand_id}
              onValueChange={(val) => setFormData({ ...formData, brand_id: val })}
              placeholder="Select a brand"
              emptyText="No brands found"
            />
          </div>
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
