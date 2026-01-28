import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { sparePartService } from '@/services/sparePartService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { warehouseService } from '@/services/warehouseService';
import { vendorService } from '@/services/vendorService';
import { modelService } from '@/services/modelService';

interface AddSparePartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddSparePartDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddSparePartDialogProps) {
  const [loading, setLoading] = useState(false);
  interface Warehouse {
    id: string;
    warehouseName: string;
  }
  interface Model {
    id: string;
    model_name: string;
  }
  interface Vendor {
    id: string;
    name: string;
  }
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [formData, setFormData] = useState({
    item_code: '',
    part_name: '',
    brand: '',
    model_id: '',
    base_price: '',
    warehouse_id: '',
    vendor_id: '',
    quantity: '0',
  });

  useEffect(() => {
    if (open) {
      loadDependencies();
    }
  }, [open]);

  const loadDependencies = async () => {
    try {
      const [whRes, modelRes, vendorRes] = await Promise.all([
        warehouseService.getWarehouses(),
        modelService.getAllModels(),
        vendorService.getVendors(),
      ]);
      setWarehouses(whRes || []);
      setModels(modelRes || []);
      setVendors(vendorRes || []);
    } catch (error) {
      console.error('Failed to load dependencies', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const respo = await sparePartService.addSparePart({
        ...formData,
        model_id: formData.model_id === 'null' ? undefined : formData.model_id,
        warehouse_id: formData.warehouse_id || undefined,
        vendor_id: formData.vendor_id || undefined,
        base_price: Number(formData.base_price),
        quantity: Number(formData.quantity)!,
      });
      console.log(respo);
      toast.success('Spare part added successfully');
      onSuccess();
      onOpenChange(false);
      setFormData({
        item_code: '',
        part_name: '',
        brand: '',
        model_id: '',
        base_price: '',
        warehouse_id: '',
        vendor_id: '',
        quantity: '',
      });
    } catch (error: unknown) {
      console.log(error);
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || 'Failed to add spare part';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Single Spare Part</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Item Code</Label>
              <Input
                required
                value={formData.item_code}
                onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Part Name</Label>
              <Input
                required
                value={formData.part_name}
                onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input
                required
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity (In Stock)</Label>
              <Input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select
                value={formData.vendor_id}
                onValueChange={(val) => setFormData({ ...formData, vendor_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Vendor (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preferred Warehouse</Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(val) => setFormData({ ...formData, warehouse_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Warehouse (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.warehouseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Compatible Model</Label>
              <Select
                value={formData.model_id}
                onValueChange={(val) => setFormData({ ...formData, model_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Model (Optional)" />
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
            <div className="space-y-2">
              <Label>Base Price</Label>
              <Input
                required
                type="number"
                min="0"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Spare Part'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
