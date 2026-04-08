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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { modelService } from '@/services/modelService';
import { sparePartService, SparePartInventoryItem } from '@/services/sparePartService';
import { warehouseService } from '@/services/warehouseService';
import { vendorService } from '@/services/vendorService';
import { MultiSelect } from '@/components/ui/multi-select';
import { toast } from 'sonner';

interface EditSparePartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: SparePartInventoryItem;
  onSuccess: () => void;
}

/**
 * Dialog component for editing an existing spare part.
 * Pre-fills form with current part details and allows modifying attributes like quantity, price, and location.
 */
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
    model_no: string;
  }
  interface Vendor {
    id: string;
    name: string;
  }

  const [models, setModels] = useState<Model[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [formData, setFormData] = useState({
    lotNumber: '',
    part_name: '',
    brand: '',
    model_ids: [] as string[],
    base_price: '',
    purchase_price: '',
    wholesale_price: '',
    warehouse_id: '',
    vendor_id: '',
    quantity: '',
  });

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [modelRes, whRes, vendorRes] = await Promise.all([
          modelService.getAllModels(),
          warehouseService.getWarehousesByBranch(),
          vendorService.getVendors(),
        ]);

        setModels(modelRes.data || []);
        const whs = whRes || [];
        setWarehouses(whs);
        const vens = vendorRes || [];
        setVendors(vens);

        // Pre-fill logic
        const model_ids = product.model_ids ? product.model_ids.split(',').filter(Boolean) : [];
        console.log('Product for edit:', product);

        let warehouseId = product.warehouse_id || '';
        if (!warehouseId && product.warehouse_name) {
          const found = whs.find((w: Warehouse) => w.warehouseName === product.warehouse_name);
          if (found) warehouseId = found.id;
        }

        let vendorId = product.vendor_id || '';
        if (!vendorId && product.vendor_name) {
          const found = vens.find((v: Vendor) => v.name === product.vendor_name);
          if (found) vendorId = found.id;
        }

        setFormData({
          lotNumber: product.lotNumber || '',
          part_name: product.part_name,
          brand: product.brand,
          model_ids: model_ids,
          base_price: String(product.price ?? ''),
          purchase_price:
            product.purchase_price !== undefined ? String(product.purchase_price) : '',
          wholesale_price:
            product.wholesale_price !== undefined ? String(product.wholesale_price) : '',
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
        model_ids: formData.model_ids.length > 0 ? formData.model_ids : undefined,
        warehouse_id: formData.warehouse_id || undefined,
        vendor_id: formData.vendor_id || undefined,
        base_price: Number(formData.base_price),
        purchase_price: Number(formData.purchase_price),
        wholesale_price: Number(formData.wholesale_price),
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card text-black">
        <DialogHeader>
          <DialogTitle>Edit Spare Part</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Lot / Order Number */}
            <div className="space-y-2">
              <Label>Lot / Order Number</Label>
              <Input
                value={formData.lotNumber}
                onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
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
              <SearchableSelect
                value={formData.vendor_id}
                onValueChange={(val) =>
                  setFormData({ ...formData, vendor_id: val === 'none' ? '' : val })
                }
                options={[
                  { value: 'none', label: 'None', description: 'Clear selection' },
                  ...vendors.map((v) => ({
                    value: v.id,
                    label: v.name,
                    description: '',
                  })),
                ]}
                placeholder="Select Vendor (Optional)"
                emptyText="No vendors found."
              />
            </div>
            {/* Warehouse */}
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <SearchableSelect
                value={formData.warehouse_id}
                onValueChange={(val) =>
                  setFormData({ ...formData, warehouse_id: val === 'none' ? '' : val })
                }
                options={[
                  { value: 'none', label: 'None', description: 'Clear selection' },
                  ...warehouses.map((w) => ({
                    value: w.id,
                    label: w.warehouseName,
                    description: '',
                  })),
                ]}
                placeholder="Select Warehouse (Optional)"
                emptyText="No warehouses found."
              />
            </div>
            {/* Price */}
            <div className="space-y-2">
              <Label>Purchase Price</Label>
              <Input
                type="number"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Wholesale Price</Label>
              <Input
                type="number"
                value={formData.wholesale_price}
                onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Selling Price</Label>
              <Input
                type="number"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
              />
            </div>
            {/* Model */}
            <div className="space-y-2 col-span-2">
              <Label>Compatible Models</Label>
              <MultiSelect
                values={formData.model_ids}
                onValuesChange={(vals) => setFormData({ ...formData, model_ids: vals })}
                options={[
                  {
                    value: 'universal',
                    label: 'Universal (No Model)',
                    description: 'Compatible with all models',
                  },
                  ...models.map((m) => ({
                    value: m.id,
                    label: `${m.model_no} - ${m.model_name}`,
                    description: '',
                  })),
                ]}
                placeholder="Select Models (Optional)"
                emptyText="No models found."
              />
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
