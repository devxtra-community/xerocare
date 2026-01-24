'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { modelService } from '@/services/modelService';
import { sparePartService, SparePartInventoryItem } from '@/services/sparePartService';
import { toast } from 'sonner';

interface EditSparePartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: SparePartInventoryItem;
  onSuccess: () => void;
}

export default function EditSparePartDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: EditSparePartDialogProps) {
  const [loading, setLoading] = useState(false);
  interface Model {
    id: string;
    model_name: string;
  }
  const [models, setModels] = useState<Model[]>([]);

  const [formData, setFormData] = useState({
    part_name: '',
    brand: '',
    model_id: '',
    base_price: '',
  });

  useEffect(() => {
    const loadModels = async () => {
      try {
        const modelRes = await modelService.getAllModels();
        setModels(modelRes || []);
        // Attempt to find model ID by name if not provided in product
        if (product.compatible_model && modelRes) {
          const found = modelRes.find((m: Model) => m.model_name === product.compatible_model);
          if (found) {
            setFormData((prev) => ({ ...prev, model_id: found.id }));
          }
        }
      } catch (error) {
        console.error('Failed to load specific models', error);
      }
    };

    if (open) {
      loadModels();
      // Initialize form with product data
      setFormData({
        part_name: product.part_name,
        brand: product.brand,
        model_id: '',
        base_price: String(product.price),
      });
    }
  }, [open, product]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await sparePartService.updateSparePart(product.id, {
        ...formData,
        model_id: formData.model_id === 'null' ? undefined : formData.model_id,
        base_price: Number(formData.base_price),
      });
      toast.success('Spare part updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error(error);
      toast.error('Failed to update spare part');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white text-black">
        <DialogHeader>
          <DialogTitle>Edit Spare Part</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Part Name</Label>
              <Input
                value={formData.part_name}
                onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <Input
                type="number"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Compatible Model</Label>
              <Select
                value={formData.model_id}
                onValueChange={(val) => setFormData({ ...formData, model_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Universal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Universal (No Model)</SelectItem>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.model_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-primary text-white">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
