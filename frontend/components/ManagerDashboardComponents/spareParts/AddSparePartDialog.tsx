'use client';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { sparePartService } from '@/services/sparePartService';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MultiSelect } from '@/components/ui/multi-select';
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
    model_no: string;
    brandRelation?: { id: string; name: string };
    brand?: { id: string; name: string };
  }

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [formData, setFormData] = useState({
    part_name: '',
    brand: '',
    model_ids: [] as string[],
    base_price: '',
    purchase_price: '',
    wholesale_price: '',
    warehouse_id: '',
    vendor_id: '',
    quantity: '1',
    lot_id: '',
    mpn: '',
    description: '',
  });

  const [selectedLotItemId, setSelectedLotItemId] = useState<string>('');
  const isNoLot = formData.lot_id === 'no-lot';

  useEffect(() => {
    if (open) {
      loadDependencies();
    }
  }, [open]);

  useEffect(() => {
    const fetchModelsForBrand = async () => {
      try {
        const modelRes = await modelService.getAllModels({
          search: formData.brand || undefined,
          limit: 100, // Fetch a reasonable number of models
        });
        setModels(modelRes.data || []);
      } catch (error) {
        console.error('Failed to fetch models for brand', error);
      }
    };

    if (open) {
      fetchModelsForBrand();
    }
  }, [formData.brand, open]);

  const loadDependencies = async () => {
    try {
      const [whRes, vendorRes, lotsRes, brandsRes] = await Promise.all([
        warehouseService.getWarehousesByBranch(),
        vendorService.getVendors(),
        lotService.getAllLots(),
        brandService.getAllBrands(),
      ]);
      setWarehouses(whRes || []);
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
      toast.error('Please select a lot or choose "No Lot"');
      return;
    }

    if (!isNoLot && !selectedLotItemId) {
      toast.error('Please select a spare part from the lot');
      return;
    }

    // Get the selected lot and lot item (if not "No Lot")
    let availableQuantity = Infinity;
    if (!isNoLot) {
      const selectedLot = lots.find((l) => l.id === formData.lot_id);
      const selectedLotItem = selectedLot?.items?.find((item) => item.id === selectedLotItemId);

      if (!selectedLotItem || !selectedLotItem.sparePart) {
        toast.error('Invalid lot item selection');
        return;
      }

      availableQuantity = selectedLotItem.receivedQuantity - selectedLotItem.usedQuantity;
    }

    const requestedQuantity = Number(formData.quantity);

    if (!isNoLot && requestedQuantity > availableQuantity) {
      toast.error(`Quantity exceeds available stock. Available: ${availableQuantity}`);
      return;
    }

    if (requestedQuantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      // Find selected lot item if exists to get SKU
      let sku = '';
      if (!isNoLot) {
        const selectedLot = lots.find((l) => l.id === formData.lot_id);
        const selectedLotItem = selectedLot?.items?.find((item) => item.id === selectedLotItemId);
        sku = selectedLotItem?.sparePart?.sku.toUpperCase() || '';
      }

      const respo = await sparePartService.addSparePart({
        ...formData,
        sku: sku || undefined, // Backend will generate SKU if undefined
        model_ids: formData.model_ids,
        warehouse_id: formData.warehouse_id || undefined,
        vendor_id: formData.vendor_id || undefined,
        base_price: Number(formData.base_price),
        purchase_price: Number(formData.purchase_price),
        wholesale_price: Number(formData.wholesale_price),
        quantity: requestedQuantity,
        lot_id: isNoLot ? undefined : formData.lot_id,
        mpn: formData.mpn,
        description: formData.description,
      });
      console.log(respo);
      toast.success('Spare part added successfully');
      onSuccess();
      onOpenChange(false);
      setFormData({
        part_name: '',
        brand: '',
        model_ids: [],
        base_price: '',
        purchase_price: '',
        wholesale_price: '',
        warehouse_id: '',
        vendor_id: '',
        quantity: '1',
        lot_id: '',
        mpn: '',
        description: '',
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
                  if (newLotId === 'no-lot') {
                    setFormData({
                      ...formData,
                      lot_id: 'no-lot',
                      vendor_id: '',
                      warehouse_id: '',
                      part_name: '',
                      brand: '',
                      base_price: '',
                      purchase_price: '',
                      wholesale_price: '',
                      mpn: '',
                      description: '',
                      model_ids: [],
                    });
                  } else {
                    const selectedLot = lots.find((l) => l.id === newLotId);
                    setFormData({
                      ...formData,
                      lot_id: newLotId,
                      vendor_id: selectedLot?.vendor?.id || '',
                      warehouse_id: selectedLot?.warehouse_id || selectedLot?.warehouseId || '',
                    });
                  }
                  setSelectedLotItemId(''); // Reset lot item when lot changes
                }}
                options={[
                  {
                    value: 'no-lot',
                    label: 'No Lot (Existing Stock)',
                    description: 'Add part without assigning to a specific lot',
                  },
                  ...lots.map((lot) => ({
                    value: lot.id,
                    label: lot.lotNumber,
                    description: lot.vendor?.name || 'Unknown Vendor',
                  })),
                ]}
                placeholder="Select Lot"
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
                        purchase_price: selectedItem.unitPrice.toString(),
                        wholesale_price: selectedItem.sparePart.wholesale_price?.toString() || '',
                        model_ids: selectedItem.sparePart.model_id
                          ? [selectedItem.sparePart.model_id]
                          : [],
                        mpn: selectedItem.sparePart.mpn || '',
                        description: selectedItem.sparePart.description || '',
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
                      const available = item.receivedQuantity - item.usedQuantity;
                      return {
                        value: item.id,
                        label: `${item.sparePart!.sku} - ${item.sparePart!.part_name}`,
                        description: `Available: ${available} / ${item.receivedQuantity} | Price: QAR ${item.unitPrice}`,
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

                      const available = selectedItem.receivedQuantity - selectedItem.usedQuantity;
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
                            ? `✓ Valid - Remaining in lot after this: ${remaining} / ${selectedItem.receivedQuantity}`
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
                disabled={!!selectedLotItemId && !isNoLot}
                className={selectedLotItemId && !isNoLot ? 'bg-muted cursor-not-allowed' : ''}
              />
              {selectedLotItemId && !isNoLot && (
                <p className="text-xs text-muted-foreground mt-1">Auto-filled from lot item</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Manufacturing Part Number (MPN)</Label>
              <Input
                value={formData.mpn}
                onChange={(e) => setFormData({ ...formData, mpn: e.target.value })}
                disabled={!!selectedLotItemId && !isNoLot}
                className={selectedLotItemId && !isNoLot ? 'bg-muted cursor-not-allowed' : ''}
                placeholder="Enter MPN (Optional)"
              />
              {selectedLotItemId && !isNoLot && (
                <p className="text-xs text-muted-foreground mt-1">Auto-filled from lot item</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              {selectedLotItemId && !isNoLot ? (
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
                  ...(() => {
                    const filteredModels = formData.brand
                      ? models.filter(
                          (m) =>
                            m.brandRelation?.name === formData.brand ||
                            m.brand?.name === formData.brand,
                        )
                      : models;
                    return filteredModels.map((m) => ({
                      value: m.id,
                      label: `${m.model_no} - ${m.model_name}`,
                      description: '',
                    }));
                  })(),
                ]}
                placeholder="Select Models (Optional)"
                emptyText="No models found."
              />
            </div>
            <div className="space-y-2">
              <Label>Purchase Price</Label>
              <Input
                required
                type="number"
                min="0"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Wholesale Price</Label>
              <Input
                required
                type="number"
                min="0"
                value={formData.wholesale_price}
                onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Selling Price</Label>
              <Input
                required
                type="number"
                min="0"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                disabled={!!selectedLotItemId && !isNoLot}
                className={selectedLotItemId && !isNoLot ? 'bg-muted cursor-not-allowed' : ''}
              />
              {selectedLotItemId && !isNoLot && (
                <p className="text-xs text-muted-foreground mt-1">Auto-filled from lot item</p>
              )}
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description (Optional)"
                className="resize-none"
                rows={3}
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
