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
import { warehouseService } from '@/services/warehouseService';
import { vendorService } from '@/services/vendorService';
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

  const [models, setModels] = useState<Model[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [formData, setFormData] = useState({
    item_code: '',
    part_name: '',
    brand: '',
    model_id: '',
    base_price: '',
    warehouse_id: '',
    vendor_id: '',
    quantity: '',
  });

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [modelRes, whRes, vendorRes] = await Promise.all([
          modelService.getAllModels(),
          warehouseService.getWarehouses(),
          vendorService.getVendors(),
        ]);

        setModels(modelRes || []);
        const whs = whRes || [];
        setWarehouses(whs);
        const vens = vendorRes || [];
        setVendors(vens);

        // Pre-fill logic
        let modelId = '';
        if (product.compatible_model) {
          const found = (modelRes || []).find(
            (m: Model) => m.model_name === product.compatible_model,
          );
          if (found) modelId = found.id;
        }

        let warehouseId = '';
        if (product.warehouse_name) {
          const found = whs.find((w: Warehouse) => w.warehouseName === product.warehouse_name);
          if (found) warehouseId = found.id;
        }

        let vendorId = '';
        if (product.vendor_name) {
          const found = vens.find((v: Vendor) => v.name === product.vendor_name);
          if (found) vendorId = found.id;
        }

        setFormData({
          item_code: product.item_code || '',
          part_name: product.part_name,
          brand: product.brand,
          model_id: modelId,
          base_price: String(product.price),
          warehouse_id: warehouseId,
          vendor_id: vendorId,
          quantity: String(product.quantity),
        });
      } catch (error) {
        console.error('Failed to load dependencies', error);
      }
    };

    if (open) {
      loadDependencies();
    }
  }, [open, product]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await sparePartService.updateSparePart(product.id, {
        ...formData,
        model_id:
          formData.model_id === 'null' || !formData.model_id ? undefined : formData.model_id,
        warehouse_id: formData.warehouse_id || undefined,
        vendor_id: formData.vendor_id || undefined,
        base_price: Number(formData.base_price),
        quantity: Number(formData.quantity),
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white text-black">
        <DialogHeader>
          <DialogTitle>Edit Spare Part</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Item Code */}
            <div className="space-y-2">
              <Label>Item Code</Label>
              <Input
                value={formData.item_code}
                onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
              />
            </div>
            {/* Part Name */}
            <div className="space-y-2">
              <Label>Part Name</Label>
              <Input
                value={formData.part_name}
                onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
              />
            </div>
            {/* Brand */}
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>
            {/* Quantity */}
            <div className="space-y-2">
              <Label>Quantity (In Stock)</Label>
              <Input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
            {/* Vendor */}
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
            {/* Warehouse */}
            <div className="space-y-2">
              <Label>Warehouse</Label>
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
            {/* Price */}
            <div className="space-y-2">
              <Label>Price</Label>
              <Input
                type="number"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
              />
            </div>
            {/* Model */}
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
