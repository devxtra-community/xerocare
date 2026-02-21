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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { lotService, Lot, Vendor } from '@/lib/lot';
import { warehouseService } from '@/services/warehouseService';
import { vendorService } from '@/services/vendorService';
import { modelService } from '@/services/modelService';
import { brandService } from '@/services/brandService';
import { Brand } from '@/lib/brand';

interface AddSparePartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/**
 * Dialog component for adding a single spare part to inventory.
 * Features:
 * - Lot selection with dependency loading (Models, Vendors, Warehouses).
 * - Auto-populating fields based on selected lot item.
 * - Validation of quantity against lot availability.
 */
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
  const [brands, setBrands] = useState<Brand[]>([]);

  const [formData, setFormData] = useState({
    part_name: '',
    brand: '',
    model_id: '',
    base_price: '',
    warehouse_id: '',
    vendor_id: '',
    quantity: '1',
    lot_id: '',
  });

  const [selectedLotItemId, setSelectedLotItemId] = useState<string>('');

  useEffect(() => {
    if (open) {
      loadDependencies();
    }
  }, [open]);

  const loadDependencies = async () => {
    try {
      const [whRes, modelRes, vendorRes, lotsRes, brandsRes] = await Promise.all([
        warehouseService.getWarehousesByBranch(),
        modelService.getAllModels(),
        vendorService.getVendors(),
        lotService.getAllLots(),
        brandService.getAllBrands(),
      ]);
      setWarehouses(whRes || []);
      setModels(modelRes.data || []);
      setVendors(vendorRes || []);
      setLots(lotsRes.data || []);
      setBrands(brandsRes || []);
    } catch (error) {
      console.error('Failed to load dependencies', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate lot selection
    if (!formData.lot_id) {
      toast.error('Please select a lot');
      return;
    }

    // Validate lot item selection
    if (!selectedLotItemId) {
      toast.error('Please select a spare part from the lot');
      return;
    }

    // Get the selected lot and lot item
    const selectedLot = lots.find((l) => l.id === formData.lot_id);
    const selectedLotItem = selectedLot?.items?.find((item) => item.id === selectedLotItemId);

    if (!selectedLotItem || !selectedLotItem.sparePart) {
      toast.error('Invalid lot item selection');
      return;
    }

    // Validate quantity against available stock
    const availableQuantity = selectedLotItem.quantity - selectedLotItem.usedQuantity;
    const requestedQuantity = Number(formData.quantity);

    if (requestedQuantity > availableQuantity) {
      toast.error(`Quantity exceeds available stock. Available: ${availableQuantity}`);
      return;
    }

    if (requestedQuantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const respo = await sparePartService.addSparePart({
        ...formData,
        item_code: selectedLotItem.sparePart.item_code.toUpperCase(),
        model_id: formData.model_id === 'null' ? undefined : formData.model_id,
        warehouse_id: formData.warehouse_id || undefined,
        vendor_id: formData.vendor_id || undefined,
        base_price: Number(formData.base_price),
        quantity: requestedQuantity,
        lot_id: formData.lot_id,
      });
      console.log(respo);
      toast.success('Spare part added successfully');
      onSuccess();
      onOpenChange(false);
      setFormData({
        part_name: '',
        brand: '',
        model_id: '',
        base_price: '',
        warehouse_id: '',
        vendor_id: '',
        quantity: '1',
        lot_id: '',
      });
      setSelectedLotItemId('');
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
            <div className="space-y-2 col-span-2">
              <Label>
                Lot Selection <span className="text-red-500">*</span>
              </Label>
              <SearchableSelect
                value={formData.lot_id}
                onValueChange={(val) => {
                  const newLotId = val === 'none' ? '' : val;
                  const selectedLot = lots.find((l) => l.id === newLotId);
                  setFormData({
                    ...formData,
                    lot_id: newLotId,
                    vendor_id: selectedLot?.vendor?.id || '',
                    warehouse_id: selectedLot?.warehouse_id || selectedLot?.warehouseId || '',
                  });
                  setSelectedLotItemId(''); // Reset lot item when lot changes
                }}
                options={lots.map((lot) => ({
                  value: lot.id,
                  label: lot.lotNumber,
                  description: lot.vendor?.name || 'Unknown Vendor',
                }))}
                placeholder="Select Lot (Required)"
                emptyText="No lots found."
              />
            </div>

            {/* Lot Item Selection - Only show when lot is selected */}
            {formData.lot_id && (
              <div className="space-y-2 col-span-2">
                <Label>
                  Select Spare Part from Lot <span className="text-red-500">*</span>
                </Label>
                <SearchableSelect
                  value={selectedLotItemId}
                  onValueChange={(val) => {
                    setSelectedLotItemId(val);

                    // Auto-populate fields from selected lot item
                    const selectedLot = lots.find((l) => l.id === formData.lot_id);
                    const selectedItem = selectedLot?.items?.find((item) => item.id === val);

                    if (selectedItem?.sparePart) {
                      setFormData({
                        ...formData,
                        part_name: selectedItem.sparePart.part_name,
                        brand: selectedItem.sparePart.brand,
                        base_price: selectedItem.unitPrice.toString(),
                        model_id: selectedItem.sparePart.model_id || '',
                      });
                    }
                  }}
                  options={(() => {
                    const selectedLot = lots.find((l) => l.id === formData.lot_id);
                    const sparePartItems =
                      selectedLot?.items?.filter(
                        (item) => item.itemType === 'SPARE_PART' && item.sparePart,
                      ) || [];

                    return sparePartItems.map((item) => {
                      const available = item.quantity - item.usedQuantity;
                      return {
                        value: item.id,
                        label: `${item.sparePart!.item_code} - ${item.sparePart!.part_name}`,
                        description: `Available: ${available} / ${item.quantity} | Price: ₹${item.unitPrice}`,
                      };
                    });
                  })()}
                  placeholder="Select Spare Part"
                  emptyText="No spare parts found in this lot."
                />

                {/* Quantity Validation Feedback */}
                {selectedLotItemId && formData.quantity && (
                  <div className="text-xs mt-1">
                    {(() => {
                      const selectedLot = lots.find((l) => l.id === formData.lot_id);
                      const selectedItem = selectedLot?.items?.find(
                        (item) => item.id === selectedLotItemId,
                      );

                      if (!selectedItem) return null;

                      const available = selectedItem.quantity - selectedItem.usedQuantity;
                      const requested = Number(formData.quantity) || 0;
                      const remaining = available - requested;

                      return (
                        <span
                          className={
                            remaining >= 0 && requested > 0
                              ? 'text-green-600 font-medium'
                              : 'text-red-500 font-bold'
                          }
                        >
                          {remaining >= 0 && requested > 0
                            ? `✓ Valid - Remaining in lot after this: ${remaining} / ${selectedItem.quantity}`
                            : `✗ Invalid - Available: ${available}, Requested: ${requested}`}
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Part Name</Label>
              <Input
                required
                value={formData.part_name}
                onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
                disabled={!!selectedLotItemId}
                className={selectedLotItemId ? 'bg-muted cursor-not-allowed' : ''}
              />
              {selectedLotItemId && (
                <p className="text-xs text-muted-foreground mt-1">Auto-filled from lot item</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              {selectedLotItemId ? (
                <>
                  <Input value={formData.brand} disabled className="bg-muted cursor-not-allowed" />
                  <p className="text-xs text-muted-foreground mt-1">Auto-filled from lot item</p>
                </>
              ) : (
                <SearchableSelect
                  value={formData.brand}
                  onValueChange={(val) => setFormData({ ...formData, brand: val })}
                  options={brands.map((brand) => ({
                    value: brand.name,
                    label: brand.name,
                    description: brand.description || '',
                  }))}
                  placeholder="Select Brand"
                  emptyText="No brands found."
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Quantity (In Stock)</Label>
              <Input
                required
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="1"
              />
            </div>
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
            <div className="space-y-2">
              <Label>Preferred Warehouse</Label>
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
            <div className="space-y-2">
              <Label>Compatible Model</Label>
              <SearchableSelect
                value={formData.model_id}
                onValueChange={(val) => setFormData({ ...formData, model_id: val })}
                options={[
                  {
                    value: 'null',
                    label: 'Universal (No Model)',
                    description: 'Compatible with all models',
                  },
                  ...models.map((m) => ({
                    value: m.id,
                    label: m.model_name,
                    description: '',
                  })),
                ]}
                placeholder="Select Model (Optional)"
                emptyText="No models found."
              />
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
              {selectedLotItemId && (
                <p className="text-xs text-muted-foreground mt-1">Auto-filled from lot item</p>
              )}
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
