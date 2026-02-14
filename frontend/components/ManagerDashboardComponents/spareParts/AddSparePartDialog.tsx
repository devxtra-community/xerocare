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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { lotService, Lot, Vendor, LotItem } from '@/lib/lot';
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

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);

  const [formData, setFormData] = useState({
    lot_number: '', // Keeps item code / legacy lot number field if needed, or we repurpose it.
    part_name: '',
    brand: '',
    model_id: '',
    base_price: '',
    warehouse_id: '',
    vendor_id: '',
    quantity: '0',
    lot_id: '',
  });

  useEffect(() => {
    if (open) {
      loadDependencies();
    }
  }, [open]);

  const loadDependencies = async () => {
    try {
      const [whRes, modelRes, vendorRes, lotsRes] = await Promise.all([
        warehouseService.getWarehousesByBranch(),
        modelService.getAllModels(),
        vendorService.getVendors(),
        lotService.getAllLots(),
      ]);
      setWarehouses(whRes || []);
      setModels(modelRes || []);
      setVendors(vendorRes || []);
      setLots(lotsRes || []);
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
        lot_number: formData.lot_number.toUpperCase(),
        model_id: formData.model_id === 'null' ? undefined : formData.model_id,
        warehouse_id: formData.warehouse_id || undefined,
        vendor_id: formData.vendor_id || undefined,
        base_price: Number(formData.base_price),
        quantity: Number(formData.quantity)!,
        lot_id: formData.lot_id === 'null' || !formData.lot_id ? undefined : formData.lot_id,
      });
      console.log(respo);
      toast.success('Spare part added successfully');
      onSuccess();
      onOpenChange(false);
      setFormData({
        lot_number: '',
        part_name: '',
        brand: '',
        model_id: '',
        base_price: '',
        warehouse_id: '',
        vendor_id: '',
        quantity: '',
        lot_id: '',
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
              <Label>Item Code / Legacy Lot No</Label>
              <Input
                required
                value={formData.lot_number}
                onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                placeholder="Unique Item Code"
              />
            </div>
            <div className="space-y-2">
              <SearchableSelect
                value={formData.lot_id}
                onValueChange={(val) =>
                  setFormData({ ...formData, lot_id: val === 'none' ? '' : val })
                }
                options={[
                  { value: 'none', label: 'None', description: 'Clear selection' },
                  ...lots.map((lot) => ({
                    value: lot.id,
                    label: lot.lotNumber,
                    description: lot.vendor?.name || 'Unknown Vendor',
                  })),
                ]}
                placeholder="Select Lot (Optional)"
                emptyText="No lots found."
              />
              {formData.lot_id && formData.lot_number && (
                <div className="text-xs mt-1">
                  {(() => {
                    const lot = lots.find((l) => l.id === formData.lot_id);
                    // Validate by Item Code (sparePart.item_code)
                    // But wait, existing lot items are linked to SparePart ID, not just code.
                    // However, creating a new spare part means we might match by code if it exists?
                    // The requirement says "Spare Parts by item_code".
                    // In LotItem, we have `sparePart` relation.
                    // If we are creating a *new* spare part, how do we match?
                    // "Prevent adding items not in a lot".
                    // If I am adding a spare part that is supposed to be in a lot,
                    // the lot must ALREADY have that spare part (or at least the item code listed in the lot?).
                    // In the backend, `validateAndTrackUsage` checks `sparePart.item_code = :identifier`.
                    // So the LotItem must exist and be linked to a SparePart with that item_code.
                    // This implies the Spare Part must exist BEFORE the Lot is created?
                    // Or the Lot is created with "Pending" spare parts?
                    // In `LotService`, we create LotItems with `spare_part_id`.
                    // So yes, the Spare Part Master must exist.
                    // But here we are in `AddSparePartDialog`. This implies creating a NEW Spare Part?
                    // Or adding stock to existing?
                    // `addSingleSparePart` creates a master record.
                    // If `item_code` is unique, we can't create it again if it exists.
                    // If we are adding stock to existing spare part, we use `update` or internal logic.
                    // `SparePartService.addSingleSparePart` fails if item_code exists (actually it creates a new row in my code? No, `createMaster` usually throws if unique constraint).
                    // Wait, my `SparePartService` does `createMaster`.
                    // If the user wants to add stock to existing part from a Lot...
                    // The `AddSparePartDialog` seems to be for "New Item".
                    // If the item is in the Lot, it must have been added to the Lot with a valid `spare_part_id`.
                    // So the global "Spare Part" definition must exist.
                    // This flow is slightly circular if we can't create Lot without Spare Part, and can't create Spare Part without Lot (if enforcing).
                    // But typically:
                    // 1. Create Spare Part Master (Code, Name) - maybe without stock.
                    // 2. Create Lot (referencing Spare Part Master).
                    // 3. Receive Stock (Update Spare Part Qty / Confirm Lot).
                    // usage: When "consuming" or "instantiating" unique items?
                    // Spare Parts are quantity based.
                    // The `LotItem.usedQuantity` logic implies we track how many we "registered" into the system?
                    // If `AddSparePartDialog` adds to `SparePart` table (Inventory), then yes, we are "receiving" into inventory.
                    // So we match by `item_code`?
                    // But `LotItem` stores `sparePartId`.
                    // So we should find the LotItem that matches the `item_code` we are entering.
                    // But since we are creating it, we might not know the ID yet?
                    // Ah, if `item_code` is the link, we iterate lot items, check `item.sparePart?.item_code`.

                    const item = lot?.items?.find(
                      (i: LotItem) =>
                        i.itemType === 'SPARE_PART' &&
                        i.sparePart?.lot_number === formData.lot_number,
                    );

                    if (!item)
                      return <span className="text-red-500">Item Code not found in this Lot!</span>;
                    const remaining = item.quantity - item.usedQuantity;
                    const requested = Number(formData.quantity) || 0;
                    return (
                      <span
                        className={
                          remaining >= requested ? 'text-green-600' : 'text-red-500 font-bold'
                        }
                      >
                        Available in Lot: {remaining} / {item.quantity}
                      </span>
                    );
                  })()}
                </div>
              )}
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
