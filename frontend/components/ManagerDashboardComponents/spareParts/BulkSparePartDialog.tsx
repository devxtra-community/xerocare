'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Upload, Save, Trash2, Plus, FileSpreadsheet, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MultiSelect } from '@/components/ui/multi-select';
import { sparePartService } from '@/services/sparePartService';
import { warehouseService, Warehouse } from '@/services/warehouseService';
import { vendorService } from '@/services/vendorService';
import { lotService, Lot, LotItemType } from '@/lib/lot';
import { brandService } from '@/services/brandService';
import { modelService } from '@/services/modelService';

import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface BulkSparePartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialLotId?: string;
  initialItemId?: string;
}

interface BulkSparePartRow {
  sku: string;
  part_name: string;
  brand: string;
  model_ids: string[];
  base_price: number;
  purchase_price: number;
  wholesale_price: number;
  quantity: number;
  vendor_id: string;
  warehouse_id: string;
  lot_id?: string;
  mpn?: string;
  model_id?: string;
}

/** A spare part option derived from the selected lot's spare part items */
interface LotSparePartOption {
  sku: string;
  partName: string;
  brand: string;
  modelIds: string[];
  basePrice: number;
  purchasePrice: number;
  wholesalePrice: number;
  mpn: string;
  label: string; // "sku - partName"
}

/**
 * Dialog component for bulk uploading spare parts via Excel.
 * - Parses Excel files to preview data.
 * - Validates foreign keys (Vendor, Model, Warehouse) by name matching.
 * - Allows selecting a Lot and a Product from that Lot per row.
 * - Allows manual addition/editing of rows before submission.
 */
export default function BulkSparePartDialog({
  open,
  onOpenChange,
  onSuccess,
  initialLotId,
  initialItemId,
}: BulkSparePartDialogProps) {
  interface Model {
    id: string;
    model_name: string;
    model_no: string;
    brandRelation?: { id: string; name: string };
    brand?: { id: string; name: string };
  }
  interface Brand {
    id: string;
    name: string;
    description?: string;
  }

  const [rows, setRows] = useState<Partial<BulkSparePartRow>[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lot state
  const [lots, setLots] = useState<Lot[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);

  const getLotSparePartItems = (lotId?: string): LotSparePartOption[] => {
    if (!lotId) return [];
    const lot = lots.find((l) => l.id === lotId);
    if (!lot) return [];
    const sparePartMap = new Map<string, LotSparePartOption>();
    lot.items
      .filter((item) => item.itemType === LotItemType.SPARE_PART && item.sparePart)
      .forEach((item) => {
        const sp = item.sparePart!;
        if (sp.sku && !sparePartMap.has(sp.sku)) {
          sparePartMap.set(sp.sku, {
            sku: sp.sku,
            partName: sp.part_name,
            brand: sp.brand,
            modelIds: sp.model_id ? [sp.model_id] : ['universal'],
            purchasePrice: item.unitPrice || sp.purchase_price || 0,
            basePrice: sp.base_price || 0,
            wholesalePrice: sp.wholesale_price || 0,
            mpn: sp.mpn || '',
            label: `${sp.sku} - ${sp.part_name}`,
          });
        }
      });
    return Array.from(sparePartMap.values());
  };

  const loadDependencies = async () => {
    try {
      const [v, w, l, b, m] = await Promise.all([
        vendorService.getVendors(),
        warehouseService.getWarehousesByBranch(),
        lotService.getAllLots(),
        brandService.getAllBrands(),
        modelService.getAllModels({ limit: 1000 }),
      ]);
      setVendors(v || []);
      setWarehouses(w || []);
      setLots(l.data || []);
      setBrands(b || []);
      setModels(m.data || []);
    } catch {
      toast.error('Failed to load dependencies');
    }
  };

  useEffect(() => {
    if (open) {
      const prepareInitialData = async () => {
        await loadDependencies();

        if (!initialLotId) {
          setRows([]);
        }
      };
      prepareInitialData();
    }
  }, [open, initialLotId, initialItemId]);

  // We need to handle the pre-filling after lots and selectedLotId are set
  useEffect(() => {
    if (open && initialLotId && lots.length > 0) {
      const lot = lots.find((l) => l.id === initialLotId);
      if (lot && lot.items) {
        let itemsToFill = lot.items.filter(
          (item) => item.itemType === LotItemType.SPARE_PART && item.sparePart,
        );

        if (initialItemId) {
          itemsToFill = itemsToFill.filter((item) => item.id === initialItemId);
        }

        const newRows = itemsToFill.map((item) => {
          const sp = item.sparePart!;
          return {
            ...createEmptyRow(),
            lot_id: initialLotId,
            sku: sp.sku,
            part_name: sp.part_name,
            brand: sp.brand,
            model_ids: sp.model_id ? [sp.model_id] : ['universal'],
            purchase_price: Number(item.unitPrice) || Number(sp.purchase_price) || 0,
            base_price: Number(sp.base_price) || 0,
            wholesale_price: Number(sp.wholesale_price) || 0,
            quantity: Math.max(0, item.receivedQuantity - item.usedQuantity),
            vendor_id: lot.vendorId || lot.vendor?.id || '',
            warehouse_id: lot.warehouse_id || '',
            mpn: sp.mpn || '',
          };
        });
        setRows(newRows);
      }
    }
  }, [lots, initialLotId, initialItemId, open]);

  // Removed global handleLotSelect to support per-row selection

  const createEmptyRow = (): Partial<BulkSparePartRow> => ({
    sku: '',
    part_name: '',
    brand: '',
    model_ids: [],
    purchase_price: 0,
    base_price: 0,
    wholesale_price: 0,
    quantity: 0,
    vendor_id: '',
    warehouse_id: '',
    lot_id: initialLotId || undefined,
    mpn: '',
  });

  const findIdByName = (
    name: string,
    list: { id: string; name?: string; model_name?: string; warehouseName?: string }[],
  ) => {
    if (!name) return '';
    const lowerName = String(name).toLowerCase().trim();
    const found = list.find((item) => {
      const itemName = (item.name || item.model_name || item.warehouseName || '').toLowerCase();
      return itemName === lowerName || item.id === name;
    });
    return found ? found.id : '';
  };

  const parseExcelData = (data: unknown[]) => {
    const parsedRows: Partial<BulkSparePartRow>[] = (data as Record<string, unknown>[]).map(
      (row) => {
        const getVal = (keys: string[]) => {
          for (const k of keys) {
            if (row[k] !== undefined) return row[k];
            const lowerK = k.toLowerCase().replace(/\s/g, '');
            for (const rowKey of Object.keys(row)) {
              const lowerRowKey = rowKey.toLowerCase().replace(/\s/g, '');
              if (lowerRowKey === lowerK) return row[rowKey];
            }
          }
          return '';
        };

        const rawModel = getVal(['model_ids', 'model_id', 'Model ID', 'Model', 'Compatible Model']);
        let parsedModelIds: string[] = [];
        if (rawModel) {
          if (String(rawModel).toLowerCase().includes('universal')) {
            parsedModelIds = ['universal'];
          } else {
            const parts = String(rawModel)
              .split(',')
              .map((s) => s.trim());
            parsedModelIds = parts.map((p) => findIdByName(p, models)).filter(Boolean);
            if (parsedModelIds.length === 0) parsedModelIds = ['universal'];
          }
        } else {
          parsedModelIds = ['universal'];
        }

        const rawVendor = getVal(['vendor_id', 'Vendor ID', 'Vendor']);
        const rawWarehouse = getVal(['warehouse_id', 'Warehouse ID', 'Warehouse']);

        const rawSku = getVal(['sku', 'SKU', 'item_code', 'Item Code']);
        let sku = rawSku;
        const rawSelect = getVal(['Select Spare Parts from Lot', 'Select Product from Lot']);

        if (!sku && rawSelect) {
          const parts = rawSelect.toString().split(' - ');
          if (parts.length > 1) {
            sku = parts[0].trim();
          }
        }

        const lotIdFromExcel = getVal(['lot_id', 'lotNumber', 'Lot ID', 'Lot', 'lot_number']);

        return {
          sku: sku ? String(sku) : '',
          part_name: String(getVal(['part_name', 'Item Name', 'Name', 'Part Name']) || ''),
          brand: String(getVal(['brand', 'Brand']) || ''),
          model_ids: parsedModelIds,
          base_price: Number(getVal(['base_price', 'Price', 'Base Price', 'Selling Price'])) || 0,
          purchase_price: Number(getVal(['purchase_price', 'Purchase Price'])) || 0,
          wholesale_price: Number(getVal(['wholesale_price', 'Wholesale Price'])) || 0,
          quantity: Number(getVal(['quantity', 'Quantity', 'Qty'])) || 0,
          vendor_id: findIdByName(String(rawVendor || ''), vendors),
          warehouse_id: findIdByName(String(rawWarehouse || ''), warehouses),
          lot_id:
            (lotIdFromExcel ? String(lotIdFromExcel) : undefined) || initialLotId || undefined,
          mpn: String(
            getVal(['mpn', 'MPN', 'Manufacturing Part Number', 'manufacturing_part_number']) || '',
          ),
        };
      },
    );

    if (parsedRows.length === 0) {
      toast.warning('No data found in the file');
    } else {
      setRows(parsedRows);
      toast.success(`Parsed ${parsedRows.length} rows`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const bstr = event.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      parseExcelData(data);
    };

    reader.readAsBinaryString(selectedFile);
  };

  const handleAddRow = () => {
    setRows([...rows, createEmptyRow()]);
  };

  const handleRemoveRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (
    index: number,
    field: keyof BulkSparePartRow,
    value: string | number | string[] | undefined,
  ) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const handleSubmit = async () => {
    const validRows = rows.filter((r) => r.part_name && r.sku);

    if (!rows.some((r) => r.lot_id)) {
      toast.error('Please assign a Lot to at least one spare part row before uploading');
      return;
    }

    if (validRows.length === 0) {
      toast.error('Please add at least one valid spare part with SKU and Name');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = validRows.map((r) => ({
        ...r,
        model_ids:
          r.model_ids?.includes('universal') || !r.model_ids?.length ? undefined : r.model_ids,
        base_price: Number(r.base_price),
        purchase_price: Number(r.purchase_price),
        wholesale_price: Number(r.wholesale_price),
        quantity: Number(r.quantity),
        lot_id: r.lot_id || undefined,
      }));

      // Strip model_id key since backend takes model_ids
      payload.forEach((p) => {
        if ('model_id' in p) delete p.model_id;
      });

      const result = await sparePartService.bulkUpload(payload);

      if (result.success) {
        toast.success(`Successfully uploaded ${result.data.success} spare parts`);
        if (result.data.failed > 0) {
          toast.warning(`${result.data.failed} items failed to upload`);
        }
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error('Bulk upload failed');
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast.error('Bulk upload failed. See console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl w-full max-w-[95vw] h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Upload size={20} /> Bulk Spare Part Upload
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar: Upload Excel + row count */}
        <div className="p-4 bg-muted/50 border-b flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 items-center w-full sm:w-auto">
            <div className="relative">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload-sp"
              />
              <label
                htmlFor="excel-upload-sp"
                className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <FileSpreadsheet size={18} />
                Upload Excel
              </label>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {rows.length > 0 ? `${rows.length} rows loaded` : 'Upload an Excel file to get started'}
          </div>
        </div>

        {/* Global Lot Selector Removed */}

        {/* Table */}
        <div className="flex-1 overflow-auto p-4">
          {rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Assign Lot</TableHead>
                  <TableHead className="min-w-[250px]">Select Spare Parts from Lot</TableHead>
                  <TableHead className="min-w-[180px]">
                    Brand <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="min-w-[250px]">
                    Part Name <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="min-w-[250px]">Compatible Model</TableHead>
                  <TableHead className="min-w-[180px]">MPN</TableHead>
                  <TableHead className="min-w-[180px]">
                    SKU <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="min-w-[200px]">Vendor</TableHead>
                  <TableHead className="min-w-[200px]">Warehouse</TableHead>
                  <TableHead className="min-w-[120px]">Purchase Price</TableHead>
                  <TableHead className="min-w-[120px]">Selling Price</TableHead>
                  <TableHead className="min-w-[120px]">Wholesale Price</TableHead>
                  <TableHead className="min-w-[100px]">Qty</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="align-top">
                      <SearchableSelect
                        value={row.lot_id || 'none'}
                        onValueChange={(val) => {
                          const newLotId = val === 'none' ? '' : val;
                          updateRow(i, 'lot_id', newLotId);
                          const lot = lots.find((l) => l.id === newLotId);
                          if (lot && !row.vendor_id) updateRow(i, 'vendor_id', lot.vendorId || '');
                          if (lot && !row.warehouse_id)
                            updateRow(i, 'warehouse_id', lot.warehouse_id || '');
                        }}
                        options={lots.map((lot) => ({
                          value: lot.id,
                          label: lot.lotNumber,
                          description: lot.vendor?.name || 'Unknown Vendor',
                        }))}
                        className="h-10"
                        placeholder="Search lot..."
                        emptyText="No lots found."
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      {(() => {
                        const localOptions = getLotSparePartItems(row.lot_id);
                        return (
                          <Select
                            value={row.sku || ''}
                            onValueChange={(v) => {
                              const opt = localOptions.find((o) => o.sku === v);
                              if (opt) {
                                updateRow(i, 'sku', opt.sku);
                                updateRow(i, 'part_name', opt.partName);
                                updateRow(i, 'brand', opt.brand);
                                updateRow(i, 'model_ids', opt.modelIds);
                                updateRow(i, 'base_price', opt.basePrice);
                                updateRow(i, 'purchase_price', opt.purchasePrice);
                                updateRow(i, 'wholesale_price', opt.wholesalePrice);
                                updateRow(i, 'mpn', opt.mpn);
                              } else {
                                updateRow(i, 'sku', v);
                              }
                            }}
                          >
                            <SelectTrigger className="w-full h-10 px-3 bg-card hover:bg-muted/50 border-input text-foreground">
                              <SelectValue placeholder="Select Part" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" disabled className="hidden">
                                Select from lot to auto-fill
                              </SelectItem>
                              {localOptions.length > 0 ? (
                                localOptions.map((opt) => (
                                  <SelectItem key={opt.sku} value={opt.sku}>
                                    {opt.label}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__none__" disabled>
                                  {row.lot_id ? 'No spare parts in this lot' : 'Select a lot first'}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="align-top">
                      <SearchableSelect
                        value={row.brand || 'none'}
                        onValueChange={(val) => {
                          const newBrand = val === 'none' ? '' : val;
                          updateRow(i, 'brand', newBrand);
                          // Auto-clear model choice if brand changes
                          if (
                            row.model_ids &&
                            row.model_ids.length > 0 &&
                            !row.model_ids.includes('universal')
                          ) {
                            updateRow(i, 'model_ids', []);
                          }
                        }}
                        options={brands.map((brand) => ({
                          value: brand.name,
                          label: brand.name,
                          description: brand.description || '',
                        }))}
                        className="h-10"
                        placeholder="Select Brand"
                        emptyText="No brands found."
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        className="h-10"
                        value={row.part_name}
                        onChange={(e) => updateRow(i, 'part_name', e.target.value)}
                        placeholder="Name"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <MultiSelect
                        values={row.model_ids || []}
                        onValuesChange={(vals) => updateRow(i, 'model_ids', vals)}
                        options={[
                          {
                            value: 'universal',
                            label: 'Universal (No Model)',
                            description: 'Compatible with all models',
                          },
                          ...(() => {
                            const filteredModels = row.brand
                              ? models.filter(
                                  (m) =>
                                    m.brandRelation?.name === row.brand ||
                                    m.brand?.name === row.brand,
                                )
                              : models;
                            return filteredModels.map((m) => ({
                              value: m.id,
                              label: `${m.model_no} - ${m.model_name}`,
                              description: '',
                            }));
                          })(),
                        ]}
                        className="h-10"
                        placeholder="Select Models"
                        emptyText="No models found."
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        className="h-10"
                        value={row.mpn || ''}
                        onChange={(e) => updateRow(i, 'mpn', e.target.value)}
                        placeholder="MPN"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        className="h-10"
                        value={row.sku}
                        onChange={(e) => updateRow(i, 'sku', e.target.value)}
                        placeholder="SKU"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <SearchableSelect
                        value={row.vendor_id || 'none'}
                        onValueChange={(v) =>
                          updateRow(i, 'vendor_id', v === 'none' ? undefined : v)
                        }
                        options={vendors.map((v) => ({
                          value: v.id,
                          label: v.name,
                        }))}
                        className="h-10"
                        placeholder="Select Vendor"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <SearchableSelect
                        value={row.warehouse_id || 'none'}
                        onValueChange={(v) =>
                          updateRow(i, 'warehouse_id', v === 'none' ? undefined : v)
                        }
                        options={warehouses.map((w) => ({
                          value: w.id,
                          label: w.warehouseName,
                        }))}
                        className="h-10"
                        placeholder="Select Warehouse"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        className="h-10"
                        type="number"
                        value={row.purchase_price}
                        onChange={(e) => updateRow(i, 'purchase_price', Number(e.target.value))}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        className="h-10"
                        type="number"
                        value={row.base_price}
                        onChange={(e) => updateRow(i, 'base_price', Number(e.target.value))}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        className="h-10"
                        type="number"
                        value={row.wholesale_price}
                        onChange={(e) => updateRow(i, 'wholesale_price', Number(e.target.value))}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        className="h-10"
                        type="number"
                        value={row.quantity}
                        onChange={(e) => updateRow(i, 'quantity', Number(e.target.value))}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="align-top pt-3 text-center">
                      <button
                        onClick={() => handleRemoveRow(i)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Upload size={48} className="mb-4 opacity-20" />
              <p>Upload an Excel file to view and edit items here</p>
              <p className="text-sm">or click &quot;Add Row&quot; to start manually</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between items-center bg-muted/50">
          <Button variant="outline" onClick={handleAddRow} className="gap-2">
            <Plus size={16} /> Add Row
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rows.length === 0 || isSubmitting}
              className="gap-2 bg-primary text-white"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSubmitting ? 'Saving...' : 'Save All'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
