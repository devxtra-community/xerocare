import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { X, Trash2, Edit2, Plus } from 'lucide-react';
import { Model, CreateModelDTO, modelService } from '@/services/modelService';
import { toast } from 'sonner';

interface ModelManagementDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ModelManagementDialog({ open, onClose }: ModelManagementDialogProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const data = await modelService.getAllModels();
      setModels(data);
    } catch {
      toast.error('Failed to fetch models');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchModels();
    }
  }, [open]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;
    try {
      await modelService.deleteModel(id);
      toast.success('Model deleted');
      fetchModels();
    } catch (error: unknown) {
      const err = error as { response?: { status: number; data?: { message?: string } } };
      if (err.response && err.response.status === 409) {
        toast.error(
          'this model contains products. first delete all associated products to delete model',
        );
      } else {
        toast.error(err.response?.data?.message || 'Failed to delete model');
      }
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.model_no}</TableCell>
                    <TableCell>
                      <div>{model.model_name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {model.description}
                      </div>
                    </TableCell>
                    <TableCell>{model.brand || '-'}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-blue-600">{model.quantity}</span>
                      <span className="text-xs text-muted-foreground ml-1">units</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingModel(model);
                            setIsFormOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(model.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {models.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No models found. Add one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
    brand: initialData?.brand || '',
    description: initialData?.description || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
              <label className="block text-sm font-medium mb-1">Brand</label>
              <Input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              />
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
