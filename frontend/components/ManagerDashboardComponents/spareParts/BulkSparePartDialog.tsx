'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  X,
  Upload,
  Save,
  Trash2,
  Plus,
  FileSpreadsheet,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MultiSelect } from '@/components/ui/multi-select';
import { BulletDescriptionInput } from '@/components/ui/bullet-description-input';
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
  description?: string;
  yield?: string;
  maxDiscountableAmount?: number;
  // Internal UI tracking — stripped before submit
  _selectedLotItemId?: string;
}

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

interface LotSparePartOption {
  id: string;
  sku: string;
  partName: string;
  brand: string;
  modelIds: string[];
  basePrice: number;
  purchasePrice: number;
  wholesalePrice: number;
  mpn: string;
  label: string;
  availableQty: number;
}

export default function BulkSparePartDialog({
  open,
  onOpenChange,
  onSuccess,
  initialLotId,
  initialItemId,
}: BulkSparePartDialogProps) {
  const [rows, setRows] = useState<Partial<BulkSparePartRow>[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [lots, setLots] = useState<Lot[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);

  const getLotSparePartItems = (lotId?: string): LotSparePartOption[] => {
    if (!lotId) return [];
    const lot = lots.find((l) => l.id === lotId);
    if (!lot) return [];
    return lot.items
      .filter((item) => item.itemType === LotItemType.SPARE_PART)
      .map((item) => {
        const sp = item.sparePart;
        const sku = sp?.sku || '';
        const partName = sp?.part_name || item.customSparePartName || 'Unnamed Spare';
        return {
          id: item.id,
          sku,
          partName,
          brand: sp?.brand || '',
          modelIds: sp?.model_id ? [sp.model_id] : item.modelIds || ['universal'],
          purchasePrice: item.unitPrice || sp?.purchase_price || 0,
          basePrice: sp?.base_price || item.unitPrice || 0,
          wholesalePrice: sp?.wholesale_price || 0,
          mpn: item.mpn || sp?.mpn || '',
          label: `${sku || 'NEW'} - ${partName}`,
          availableQty: Math.max(0, item.receivedQuantity - item.usedQuantity),
        };
      });
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

  const createEmptyRow = useCallback(
    (): Partial<BulkSparePartRow> => ({
      sku: '',
      part_name: '',
      brand: '',
      model_ids: [],
      purchase_price: 0,
      base_price: 0,
      wholesale_price: 0,
      quantity: 1,
      vendor_id: '',
      warehouse_id: '',
      lot_id: initialLotId || undefined,
      mpn: '',
      description: '',
      yield: '',
      maxDiscountableAmount: 0,
      _selectedLotItemId: '',
    }),
    [initialLotId],
  );

  useEffect(() => {
    if (open) {
      loadDependencies();
      if (!initialLotId) {
        setRows([]);
        setExpandedRows({});
      }
    }
  }, [open]);

  useEffect(() => {
    if (open && initialLotId && lots.length > 0) {
      const lot = lots.find((l) => l.id === initialLotId);
      if (lot && lot.items) {
        let itemsToFill = lot.items.filter((item) => item.itemType === LotItemType.SPARE_PART);
        if (initialItemId) {
          itemsToFill = itemsToFill.filter((item) => item.id === initialItemId);
        }
        const newRows = itemsToFill.map((item) => {
          const sp = item.sparePart;
          return {
            ...createEmptyRow(),
            lot_id: initialLotId,
            _selectedLotItemId: item.id,
            sku: sp?.sku || '',
            part_name: sp?.part_name || item.customSparePartName || '',
            brand: sp?.brand || '',
            model_ids: sp?.model_id ? [sp.model_id] : item.modelIds || ['universal'],
            purchase_price: Number(item.unitPrice) || Number(sp?.purchase_price) || 0,
            base_price: Number(sp?.base_price) || Number(item.unitPrice) || 0,
            wholesale_price: Number(sp?.wholesale_price) || 0,
            quantity: Math.max(1, item.receivedQuantity - item.usedQuantity),
            vendor_id: lot.vendorId || lot.vendor?.id || '',
            warehouse_id: lot.warehouse_id || '',
            mpn: item.mpn || sp?.mpn || '',
            description: sp?.description || '',
            yield: sp?.yield || '',
            maxDiscountableAmount: Number(sp?.maxDiscountableAmount || 0),
          };
        });
        setRows(newRows);
      }
    }
  }, [lots, initialLotId, initialItemId, open, createEmptyRow]);

  const findIdByName = (
    name: string,
    list: { id: string; name?: string; model_name?: string; warehouseName?: string }[],
  ) => {
    if (!name) return '';
    const lower = String(name).toLowerCase().trim();
    const found = list.find((item) => {
      const n = (item.name || item.model_name || item.warehouseName || '').toLowerCase();
      return n === lower || item.id === name;
    });
    return found ? found.id : '';
  };

  const parseExcelData = (data: unknown[]) => {
    const parsedRows: Partial<BulkSparePartRow>[] = (data as Record<string, unknown>[]).map(
      (row) => {
        const getVal = (keys: string[]) => {
          for (const k of keys) {
            if (row[k] !== undefined) return row[k];
            const lk = k.toLowerCase().replace(/\s/g, '');
            for (const rk of Object.keys(row)) {
              if (rk.toLowerCase().replace(/\s/g, '') === lk) return row[rk];
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
            parsedModelIds = String(rawModel)
              .split(',')
              .map((s) => s.trim())
              .map((p) => findIdByName(p, models))
              .filter(Boolean);
            if (parsedModelIds.length === 0) parsedModelIds = ['universal'];
          }
        } else {
          parsedModelIds = ['universal'];
        }

        const rawSku = getVal(['sku', 'SKU', 'item_code', 'Item Code']);
        const rawSelect = getVal(['Select Spare Parts from Lot', 'Select Product from Lot']);
        let sku = rawSku;
        if (!sku && rawSelect) {
          const parts = rawSelect.toString().split(' - ');
          if (parts.length > 1) sku = parts[0].trim();
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
          quantity: Number(getVal(['quantity', 'Quantity', 'Qty'])) || 1,
          vendor_id: findIdByName(
            String(getVal(['vendor_id', 'Vendor ID', 'Vendor']) || ''),
            vendors,
          ),
          warehouse_id: findIdByName(
            String(getVal(['warehouse_id', 'Warehouse ID', 'Warehouse']) || ''),
            warehouses,
          ),
          lot_id:
            (lotIdFromExcel ? String(lotIdFromExcel) : undefined) || initialLotId || undefined,
          mpn: String(
            getVal(['mpn', 'MPN', 'Manufacturing Part Number', 'manufacturing_part_number']) || '',
          ),
          description: String(getVal(['description', 'Description']) || ''),
          yield: String(getVal(['yield', 'Yield']) || ''),
          maxDiscountableAmount:
            Number(getVal(['maxDiscountableAmount', 'max_discount_amount', 'Max Discount'])) || 0,
          _selectedLotItemId: '',
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
      const ws = wb.Sheets[wb.SheetNames[0]];
      parseExcelData(XLSX.utils.sheet_to_json(ws));
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleAddRow = () => {
    const newRow = createEmptyRow();
    const newRows = [...rows, newRow];
    setRows(newRows);
    setExpandedRows((prev) => ({ ...prev, [newRows.length - 1]: true }));
  };

  const handleRemoveRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
    setExpandedRows((prev) => {
      const next = { ...prev };
      delete next[index];
      const updated: Record<number, boolean> = {};
      Object.keys(next).forEach((k) => {
        const idx = Number(k);
        updated[idx > index ? idx - 1 : idx] = next[idx];
      });
      return updated;
    });
  };

  const toggleRowExpanded = (index: number) => {
    setExpandedRows((prev) => ({ ...prev, [index]: !prev[index] }));
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
      const payload = validRows.map((r) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _selectedLotItemId, ...rest } = r as BulkSparePartRow;
        return {
          ...rest,
          model_ids:
            rest.model_ids?.includes('universal') || !rest.model_ids?.length
              ? undefined
              : rest.model_ids,
          base_price: Number(rest.base_price),
          purchase_price: Number(rest.purchase_price),
          wholesale_price: Number(rest.wholesale_price),
          quantity: Number(rest.quantity),
          lot_id: rest.lot_id || undefined,
          description: rest.description || undefined,
          yield: rest.yield || undefined,
          maxDiscountableAmount: Number(rest.maxDiscountableAmount || 0),
        };
      });

      const result = await sparePartService.bulkUpload(payload);

      if (result.success) {
        toast.success(`Successfully uploaded ${result.data.success} spare parts`);
        if (result.data.failed > 0) toast.warning(`${result.data.failed} items failed to upload`);
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

        {/* Toolbar */}
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

        {/* Rows */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {rows.length > 0 ? (
            rows.map((row, i) => {
              const isExpanded = !!expandedRows[i];
              const isValid = !!(row.part_name && row.sku);
              const lotOptions = getLotSparePartItems(row.lot_id);
              const lot = lots.find((l) => l.id === row.lot_id);
              const filteredModels = row.brand
                ? models.filter(
                    (m) => m.brandRelation?.name === row.brand || m.brand?.name === row.brand,
                  )
                : models;

              return (
                <div
                  key={i}
                  className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-card transition-all duration-200 hover:shadow-md"
                >
                  {/* Summary header */}
                  <div
                    onClick={() => toggleRowExpanded(i)}
                    className="p-4 bg-slate-50 border-b flex justify-between items-center cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      {isValid ? (
                        <span
                          className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0"
                          title="Valid"
                        />
                      ) : (
                        <span
                          className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0"
                          title="Missing required fields"
                        />
                      )}
                      <div className="text-left">
                        <h4 className="font-bold text-sm text-slate-800">
                          Spare Part #{i + 1}:{' '}
                          <span className="text-primary">{row.part_name || 'Unnamed Part'}</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {row.brand || 'No Brand'} • SKU: {row.sku || 'N/A'} • Qty:{' '}
                          {row.quantity ?? 0} • Price: {row.base_price ?? 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(i)}
                        className="text-red-500 hover:text-red-700 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleRowExpanded(i)}
                        className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded form body */}
                  {isExpanded && (
                    <div className="p-6 bg-white space-y-6 text-left border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left column */}
                        <div className="space-y-4">
                          <Field label="Assign Lot">
                            <SearchableSelect
                              value={row.lot_id || ''}
                              onValueChange={(val) => {
                                const newLotId = val === '__none__' ? '' : val;
                                const newLot = lots.find((l) => l.id === newLotId);
                                const newRows = [...rows];
                                newRows[i] = {
                                  ...newRows[i],
                                  lot_id: newLotId,
                                  _selectedLotItemId: '',
                                  vendor_id:
                                    newLot?.vendorId || newLot?.vendor?.id || row.vendor_id || '',
                                  warehouse_id: newLot?.warehouse_id || row.warehouse_id || '',
                                };
                                setRows(newRows);
                              }}
                              options={[
                                { value: '__none__', label: '— None —' },
                                ...lots.map((l) => ({
                                  value: l.id,
                                  label: l.lotNumber,
                                  description: l.vendor?.name || '',
                                })),
                              ]}
                              placeholder="Select Lot"
                              emptyText="No lots"
                            />
                          </Field>

                          {row.lot_id && (
                            <Field label="Select Spare Part from Lot">
                              <SearchableSelect
                                value={row._selectedLotItemId || ''}
                                onValueChange={(val) => {
                                  const opt = lotOptions.find((o) => o.id === val);
                                  if (opt) {
                                    const newRows = [...rows];
                                    newRows[i] = {
                                      ...newRows[i],
                                      _selectedLotItemId: val,
                                      sku: opt.sku,
                                      part_name: opt.partName,
                                      brand: opt.brand,
                                      model_ids: opt.modelIds,
                                      base_price: opt.basePrice,
                                      purchase_price: opt.purchasePrice,
                                      wholesale_price: opt.wholesalePrice,
                                      mpn: opt.mpn,
                                      quantity: opt.availableQty || 1,
                                      vendor_id:
                                        lot?.vendorId || lot?.vendor?.id || row.vendor_id || '',
                                      warehouse_id: lot?.warehouse_id || row.warehouse_id || '',
                                    };
                                    setRows(newRows);
                                  }
                                }}
                                options={lotOptions.map((o) => ({
                                  value: o.id,
                                  label: o.label,
                                  description: `Available: ${o.availableQty}`,
                                }))}
                                placeholder={
                                  lotOptions.length === 0
                                    ? 'No spare parts in this lot'
                                    : 'Select from lot to auto-fill'
                                }
                                emptyText="No spare parts in this lot"
                              />
                            </Field>
                          )}

                          <Field label="Part Name *">
                            <Input
                              value={row.part_name || ''}
                              onChange={(e) => updateRow(i, 'part_name', e.target.value)}
                              placeholder="Part Name"
                            />
                          </Field>

                          <Field label="MPN (Manufacturing Part Number)">
                            <Input
                              value={row.mpn || ''}
                              onChange={(e) => updateRow(i, 'mpn', e.target.value)}
                              placeholder="MPN (Optional)"
                            />
                          </Field>

                          <Field label="Brand">
                            <SearchableSelect
                              value={row.brand || ''}
                              onValueChange={(val) => {
                                updateRow(i, 'brand', val);
                                if (
                                  row.model_ids &&
                                  row.model_ids.length > 0 &&
                                  !row.model_ids.includes('universal')
                                ) {
                                  updateRow(i, 'model_ids', []);
                                }
                              }}
                              options={brands.map((b) => ({
                                value: b.name,
                                label: b.name,
                                description: b.description || '',
                              }))}
                              placeholder="Select Brand"
                              emptyText="No brands"
                            />
                          </Field>

                          <Field label="Compatible Models">
                            <MultiSelect
                              values={row.model_ids || []}
                              onValuesChange={(vals) => updateRow(i, 'model_ids', vals)}
                              options={[
                                {
                                  value: 'universal',
                                  label: 'Universal (No Model)',
                                  description: 'Compatible with all models',
                                },
                                ...filteredModels.map((m) => ({
                                  value: m.id,
                                  label: `${m.model_no} - ${m.model_name}`,
                                  description: '',
                                })),
                              ]}
                              placeholder="Select Models"
                              emptyText="No models"
                            />
                          </Field>
                        </div>

                        {/* Right column */}
                        <div className="space-y-4">
                          <Field label="SKU *">
                            <Input
                              value={row.sku || ''}
                              onChange={(e) => updateRow(i, 'sku', e.target.value)}
                              placeholder="SKU (auto-generated if empty)"
                            />
                          </Field>

                          <Field label="Quantity">
                            <Input
                              type="number"
                              min={1}
                              value={row.quantity ?? 1}
                              onChange={(e) => updateRow(i, 'quantity', Number(e.target.value))}
                              placeholder="1"
                            />
                          </Field>

                          <div className="grid grid-cols-2 gap-4">
                            <Field label="Vendor">
                              <SearchableSelect
                                value={row.vendor_id || ''}
                                onValueChange={(v) =>
                                  updateRow(i, 'vendor_id', v === '__none__' ? '' : v)
                                }
                                options={[
                                  { value: '__none__', label: 'None' },
                                  ...vendors.map((v) => ({ value: v.id, label: v.name })),
                                ]}
                                placeholder="Select Vendor"
                              />
                            </Field>
                            <Field label="Warehouse">
                              <SearchableSelect
                                value={row.warehouse_id || ''}
                                onValueChange={(v) =>
                                  updateRow(i, 'warehouse_id', v === '__none__' ? '' : v)
                                }
                                options={[
                                  { value: '__none__', label: 'None' },
                                  ...warehouses.map((w) => ({
                                    value: w.id,
                                    label: w.warehouseName,
                                  })),
                                ]}
                                placeholder="Select Warehouse"
                              />
                            </Field>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <Field label="Purchase Price">
                              <Input
                                type="number"
                                min={0}
                                value={row.purchase_price ?? 0}
                                onChange={(e) =>
                                  updateRow(i, 'purchase_price', Number(e.target.value))
                                }
                                placeholder="0"
                              />
                            </Field>
                            <Field label="Selling Price">
                              <Input
                                type="number"
                                min={0}
                                value={row.base_price ?? 0}
                                onChange={(e) => updateRow(i, 'base_price', Number(e.target.value))}
                                placeholder="0"
                              />
                            </Field>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <Field label="Wholesale Price">
                              <Input
                                type="number"
                                min={0}
                                value={row.wholesale_price ?? 0}
                                onChange={(e) =>
                                  updateRow(i, 'wholesale_price', Number(e.target.value))
                                }
                                placeholder="0"
                              />
                            </Field>
                            <Field label="Max Discount (QAR)">
                              <Input
                                type="number"
                                min={0}
                                value={row.maxDiscountableAmount ?? 0}
                                onChange={(e) =>
                                  updateRow(i, 'maxDiscountableAmount', Number(e.target.value))
                                }
                                placeholder="0"
                              />
                            </Field>
                          </div>

                          <Field label="Yield Specification">
                            <Input
                              value={row.yield || ''}
                              onChange={(e) => updateRow(i, 'yield', e.target.value)}
                              placeholder="Ex. 36,000 pages @ 5% coverage"
                            />
                          </Field>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="pt-4 border-t">
                        <BulletDescriptionInput
                          label="Spare Part Details (Bullet Points)"
                          value={row.description || ''}
                          onChange={(val) => updateRow(i, 'description', val)}
                          placeholder="Ex. High quality replacement fuser"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
