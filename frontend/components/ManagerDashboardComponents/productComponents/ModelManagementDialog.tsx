import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StandardTable } from '@/components/table/StandardTable';
import { usePagination } from '@/hooks/usePagination';
import { DeleteConfirmDialog } from '@/components/dialogs/DeleteConfirmDialog';
import { X, Trash2, Edit2, Plus } from 'lucide-react';
import { Model, CreateModelDTO, modelService } from '@/services/modelService';
import { getBrands, Brand } from '@/lib/brand';
import { toast } from 'sonner';

interface ModelManagementDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Dialog for managing models within other contexts.
 * lists available models and provides add/edit/delete actions similar to the main page.
 */
export function ModelManagementDialog({ open, onClose }: ModelManagementDialogProps) {
  const { page, limit, total, setPage, setLimit, setTotal } = usePagination(10);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await modelService.getAllModels({ page, limit });
      setModels(res.data || []);
      setTotal(res.total || res.data.length);
    } catch {
      toast.error('Failed to fetch models');
    } finally {
      setLoading(false);
    }
  }, [page, limit, setTotal]);

  useEffect(() => {
    if (open) {
      fetchModels();
    }
  }, [open, fetchModels]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await modelService.deleteModel(deleteId);
      toast.success('Model deleted');
      fetchModels();
      setDeleteId(null);
    } catch (error: unknown) {
      const err = error as { response?: { status: number; data?: { message?: string } } };
      if (err.response && err.response.status === 409) {
        toast.error(
          'this model contains products. first delete all associated products to delete model',
        );
      } else {
        toast.error(err.response?.data?.message || 'Failed to delete model');
      }
      setDeleteId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Model Management</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex justify-end">
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus size={16} /> Add Model
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="text-center py-8">Loading models...</div>
          ) : (
            <StandardTable
              columns={[
                {
                  id: 'model_no',
                  header: 'MODEL NO',
                  accessorKey: 'model_no' as keyof Model,
                  className: 'font-semibold text-[11px] text-primary uppercase',
                },
                {
                  id: 'name',
                  header: 'NAME',
                  className: 'font-semibold text-[11px] text-primary uppercase',
                  cell: (model: Model) => (
                    <div>
                      <div className="font-medium">{model.model_name}</div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                        {model.description}
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'brand',
                  header: 'BRAND',
                  cell: (model: Model) => model.brandRelation?.name || '-',
                  className: 'font-semibold text-[11px] text-primary uppercase',
                },
                {
                  id: 'qty',
                  header: 'QUANTITY',
                  className: 'font-semibold text-[11px] text-primary uppercase w-[100px]',
                  cell: (model: Model) => (
                    <>
                      <span className="font-bold text-blue-600">{model.quantity}</span>
                      <span className="text-[10px] text-muted-foreground ml-1 font-medium">
                        units
                      </span>
                    </>
                  ),
                },
                {
                  id: 'actions',
                  header: 'ACTIONS',
                  className: 'font-semibold text-[11px] text-primary uppercase text-right w-[80px]',
                  cell: (model: Model) => (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingModel(model);
                          setIsFormOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteId(model.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={models}
              loading={loading}
              emptyMessage="No models found. Add one to get started."
              keyExtractor={(model) => model.id}
              page={page}
              limit={limit}
              total={total}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          )}
        </div>
      </div>

      {isFormOpen && (
        <ModelForm
          initialData={editingModel}
          onClose={() => {
            setIsFormOpen(false);
            setEditingModel(null);
          }}
          onSuccess={() => {
            setIsFormOpen(false);
            setEditingModel(null);
            fetchModels();
          }}
        />
      )}

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Model?"
        itemName={models.find((m) => m.id === deleteId)?.model_name}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function ModelForm({
  initialData,
  onClose,
  onSuccess,
}: {
  initialData: Model | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<CreateModelDTO>({
    model_no: initialData?.model_no || '',
    model_name: initialData?.model_name || '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.brand_id) {
      toast.error('Select a brand to add a model');
      return;
    }
    try {
      if (initialData) {
        await modelService.updateModel(initialData.id, form);
        toast.success('Model updated successfully');
      } else {
        await modelService.createModel(form);
        toast.success('Model created successfully');
      }
      onSuccess();
    } catch {
      toast.error(initialData ? 'Failed to update model' : 'Failed to create model');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">{initialData ? 'Edit Model' : 'Add New Model'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Model No <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={form.model_no}
                onChange={(e) => setForm({ ...form, model_no: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Model Name <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={form.model_name}
                onChange={(e) => setForm({ ...form, model_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Brand <span className="text-red-500">*</span>
              </label>
              <Select
                required
                value={form.brand_id}
                onValueChange={(value) => setForm({ ...form, brand_id: value })}
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
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Model</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
