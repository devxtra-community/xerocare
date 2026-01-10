import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Trash2, Edit2, Plus } from 'lucide-react';
import { Model, getAllModels, addModel, updateModel, deleteModel } from '@/lib/model';
import { toast } from 'sonner';

interface ModelManagementDialogProps {
  onClose: () => void;
  onModelChange: () => void; // Trigger refresh in parent
}

export function ModelManagementDialog({ onClose, onModelChange }: ModelManagementDialogProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Model | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    model_name: '',
    model_no: '',
    wholesale_price: 0,
  });

  const fetchModels = async () => {
    try {
      setLoading(true);
      const data = await getAllModels();
      setModels(data);
    } catch {
      toast.error('Failed to fetch models');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleSubmit = async () => {
    try {
      if (editing) {
        await updateModel(editing.id, formData);
        toast.success('Model updated successfully');
      } else {
        await addModel(formData);
        toast.success('Model created successfully');
      }
      fetchModels();
      onModelChange();
      resetForm();
    } catch {
      toast.error('Failed to save model');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;
    try {
      await deleteModel(id);
      toast.success('Model deleted successfully');
      fetchModels();
      onModelChange();
    } catch {
      toast.error('Failed to delete model');
    }
  };

  const resetForm = () => {
    setEditing(null);
    setIsAdding(false);
    setFormData({ model_name: '', model_no: '', wholesale_price: 0 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-semibold text-blue-900">Manage Models</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* List of Models */}
        {!isAdding && !editing ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-700">Existing Models</h3>
              <Button size="sm" onClick={() => setIsAdding(true)} className="gap-2">
                <Plus size={16} /> Add Model
              </Button>
            </div>

            <div className="border rounded-lg divide-y">
              {models.length === 0 && !loading && (
                <div className="p-4 text-center text-gray-500">No models found</div>
              )}
              {models.map((m) => (
                <div key={m.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-semibold text-blue-900">{m.model_name}</p>
                    <p className="text-sm text-gray-500">
                      {m.model_no} - ₹{m.wholesale_price}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditing(m);
                        setFormData({
                          model_name: m.model_name,
                          model_no: m.model_no,
                          wholesale_price: m.wholesale_price,
                        });
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Add/Edit Form */
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">
              {editing ? 'Edit Model' : 'Add New Model'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Model No</label>
                <Input
                  value={formData.model_no}
                  onChange={(e) => setFormData({ ...formData, model_no: e.target.value })}
                  placeholder="e.g. HP-LJ-1020"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Model Name</label>
                <Input
                  value={formData.model_name}
                  onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                  placeholder="e.g. HP LaserJet 1020"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Wholesale Price (₹)</label>
                <Input
                  type="number"
                  value={formData.wholesale_price}
                  onChange={(e) =>
                    setFormData({ ...formData, wholesale_price: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Save</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
