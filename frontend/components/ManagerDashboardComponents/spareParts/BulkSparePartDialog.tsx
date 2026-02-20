'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Upload, Save, Trash2, Plus, FileSpreadsheet } from 'lucide-react';
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
import { sparePartService } from '@/services/sparePartService';
import { warehouseService, Warehouse } from '@/services/warehouseService';
import { vendorService } from '@/services/vendorService';
import { lotService, Lot, LotItemType } from '@/lib/lot';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface BulkSparePartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface BulkSparePartRow {
  item_code: string;
  part_name: string;
  brand: string;
  model_id: string;
  base_price: number;
  quantity: number;
  vendor_id: string;
  warehouse_id: string;
  lot_id?: string;
}

/** A spare part option derived from the selected lot's spare part items */
interface LotSparePartOption {
  itemCode: string;
  partName: string;
  brand: string;
  modelId: string;
  basePrice: number;
  label: string; // "itemCode - partName"
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
}: BulkSparePartDialogProps) {
  const [rows, setRows] = useState<Partial<BulkSparePartRow>[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [file, setFile] = useState<File | null>(null);

  // Lot state
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState('');
  const [lotSparePartOptions, setLotSparePartOptions] = useState<LotSparePartOption[]>([]);

  const loadDependencies = async () => {
    try {
      const [v, w, l] = await Promise.all([
        vendorService.getVendors(),
        warehouseService.getWarehousesByBranch(),
        lotService.getAllLots(),
      ]);
      setVendors(v || []);
      setWarehouses(w || []);
      setLots(l || []);
    } catch {
      toast.error('Failed to load dependencies');
    }
  };

  useEffect(() => {
    if (open) {
      setRows([]);
      setFile(null);
      setSelectedLotId('');
      setLotSparePartOptions([]);
      loadDependencies();
    }
  }, [open]);

  /** When a lot is selected, extract the model options from its spare part items */
  const handleLotSelect = (lotId: string) => {
    setSelectedLotId(lotId);

    if (!lotId) {
      setLotSparePartOptions([]);
      return;
    }

    const lot = lots.find((l) => l.id === lotId);
    if (!lot) return;

    // Collect unique spare parts from spare part items in this lot
    const sparePartMap = new Map<string, LotSparePartOption>();
    lot.items
      .filter((item) => item.itemType === LotItemType.SPARE_PART && item.sparePart)
      .forEach((item) => {
        const sp = item.sparePart!;
        if (sp.item_code && !sparePartMap.has(sp.item_code)) {
          sparePartMap.set(sp.item_code, {
            itemCode: sp.item_code,
            partName: sp.part_name,
            brand: sp.brand,
            modelId: sp.model_id || '',
            basePrice: item.unitPrice || sp.base_price,
            label: `${sp.item_code} - ${sp.part_name}`,
          });
        }
      });

    setLotSparePartOptions(Array.from(sparePartMap.values()));

    // Apply the lot_id to all existing rows
    // Also auto-fill vendor and warehouse from the selected lot if not already set
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        lot_id: lotId,
        vendor_id: r.vendor_id || lot.vendorId || '',
        warehouse_id: r.warehouse_id || lot.warehouse_id || '',
      })),
    );
  };

  const createEmptyRow = (): Partial<BulkSparePartRow> => ({
    item_code: '',
    part_name: '',
    brand: '',
    model_id: '',
    base_price: 0,
    quantity: 0,
    vendor_id: '',
    warehouse_id: '',
    lot_id: selectedLotId || undefined,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseExcelData = (data: any[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedRows: Partial<BulkSparePartRow>[] = data.map((row: any) => {
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

      const rawModel = getVal(['model_id', 'Model ID', 'Model', 'Compatible Model']);
      let modelId = findIdByName(rawModel, []);
      if (!modelId && rawModel) {
        modelId = rawModel;
      }

      const rawVendor = getVal(['vendor_id', 'Vendor ID', 'Vendor']);
      const rawWarehouse = getVal(['warehouse_id', 'Warehouse ID', 'Warehouse']);

      const rawItemCode = getVal(['item_code', 'Item Code']);
      let itemCode = rawItemCode;
      const rawSelect = getVal(['Select Spare Parts from Lot', 'Select Product from Lot']);

      if (!itemCode && rawSelect) {
        const parts = rawSelect.toString().split(' - ');
        if (parts.length > 1) {
          itemCode = parts[0].trim();
        }
      }

      const lotIdFromExcel = getVal(['lot_id', 'Lot ID', 'Lot', 'lot_number']);

      return {
        item_code: itemCode,
        part_name: getVal(['part_name', 'Item Name', 'Name', 'Part Name']),
        brand: getVal(['brand', 'Brand']),
        model_id: modelId,
        base_price: Number(getVal(['base_price', 'Price', 'Base Price'])) || 0,
        quantity: Number(getVal(['quantity', 'Quantity', 'Qty'])) || 0,
        vendor_id: findIdByName(rawVendor, vendors),
        warehouse_id: findIdByName(rawWarehouse, warehouses),
        lot_id: lotIdFromExcel || selectedLotId || undefined,
      };
    });

    if (parsedRows.length === 0) {
      toast.warning('No data found in the file');
    } else {
      setRows(parsedRows);

      // Auto-select lot from Excel's lot_id column if not already selected
      const firstLotId = parsedRows[0]?.lot_id;
      if (firstLotId && !selectedLotId) {
        handleLotSelect(firstLotId);
      }

      toast.success(`Parsed ${parsedRows.length} rows`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateRow = (index: number, field: keyof BulkSparePartRow, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const handleSubmit = async () => {
    const validRows = rows.filter((r) => r.part_name && r.item_code);

    if (!selectedLotId && !rows.some((r) => r.lot_id)) {
      toast.error('Please select a Lot before uploading');
      return;
    }

    if (validRows.length === 0) {
      toast.error('Please add at least one valid spare part with Item Code and Name');
      return;
    }

    try {
      const payload = validRows.map((r) => ({
        ...r,
        model_id: !r.model_id || r.model_id === 'universal' ? undefined : r.model_id,
        base_price: Number(r.base_price),
        quantity: Number(r.quantity),
        lot_id: r.lot_id || selectedLotId || undefined,
      }));

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
    }
  };

  if (!open) return null;

  const selectedLot = lots.find((l) => l.id === selectedLotId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl">
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

        {/* Lot Selector + Product from Lot info */}
        <div className="px-4 py-3 bg-white border-b flex flex-wrap gap-4 items-end">
          {/* Select Lot — searchable, same as AddSparePartDialog */}
          <div className="w-80">
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
              Select Lot <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              value={selectedLotId}
              onValueChange={(val) => handleLotSelect(val === 'none' ? '' : val)}
              options={lots.map((lot) => ({
                value: lot.id,
                label: lot.lotNumber,
                description: lot.vendor?.name || 'Unknown Vendor',
              }))}
              placeholder="Search by lot number or vendor…"
              emptyText="No lots found."
            />
          </div>

          {/* Info: available models from this lot */}
          {selectedLot && (
            <div className="text-xs text-blue-600 font-medium mt-5">
              {lotSparePartOptions.length > 0 ? (
                <>
                  ✓ {lotSparePartOptions.length} part(s) available from this lot:{' '}
                  <span className="text-gray-600">
                    {lotSparePartOptions.map((o) => o.label).join(', ')}
                  </span>
                </>
              ) : (
                <span className="text-amber-600">
                  ⚠ No models linked to spare parts in this lot. Parts will be uploaded as
                  Universal.
                </span>
              )}
            </div>
          )}

          {!selectedLotId && (
            <div className="text-xs text-amber-500 mt-5 font-medium">
              * Select a lot to link spare parts and enable product-from-lot selection.
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-4">
          {rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">
                    Item Code <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="min-w-[200px]">
                    Part Name <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="min-w-[150px]">
                    Brand <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="min-w-[120px]">Price</TableHead>
                  <TableHead className="min-w-[100px]">Qty</TableHead>
                  <TableHead className="min-w-[200px]">Vendor</TableHead>
                  <TableHead className="min-w-[200px]">Warehouse</TableHead>
                  <TableHead className="min-w-[300px]">Select Spare Parts from Lot</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Input
                        value={row.item_code}
                        onChange={(e) => updateRow(i, 'item_code', e.target.value)}
                        placeholder="Code"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.part_name}
                        onChange={(e) => updateRow(i, 'part_name', e.target.value)}
                        placeholder="Name"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.brand}
                        onChange={(e) => updateRow(i, 'brand', e.target.value)}
                        placeholder="Brand"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.base_price}
                        onChange={(e) => updateRow(i, 'base_price', Number(e.target.value))}
                        placeholder="Base Price"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.quantity}
                        onChange={(e) => updateRow(i, 'quantity', Number(e.target.value))}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.vendor_id}
                        onValueChange={(v) => updateRow(i, 'vendor_id', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.warehouse_id}
                        onValueChange={(v) => updateRow(i, 'warehouse_id', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.warehouseName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {/* Select Product from Lot — shows models from the selected lot */}
                      <Select
                        value={row.item_code || ''}
                        onValueChange={(v) => {
                          const opt = lotSparePartOptions.find((o) => o.itemCode === v);
                          if (opt) {
                            updateRow(i, 'item_code', opt.itemCode);
                            updateRow(i, 'part_name', opt.partName);
                            updateRow(i, 'brand', opt.brand);
                            updateRow(i, 'model_id', opt.modelId);
                            updateRow(i, 'base_price', opt.basePrice);
                          } else {
                            updateRow(i, 'item_code', v);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Part" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" disabled>
                            Select from lot to auto-fill
                          </SelectItem>
                          {lotSparePartOptions.length > 0 ? (
                            lotSparePartOptions.map((opt) => (
                              <SelectItem key={opt.itemCode} value={opt.itemCode}>
                                {opt.label}
                              </SelectItem>
                            ))
                          ) : (
                            // Fallback: show a disabled hint if no lot selected
                            <SelectItem value="__none__" disabled>
                              {selectedLotId ? 'No spare parts in this lot' : 'Select a lot first'}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleRemoveRow(i)}
                        className="text-red-500 hover:text-red-700"
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
              disabled={rows.length === 0}
              className="gap-2 bg-primary text-white"
            >
              <Save size={16} /> Save All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
