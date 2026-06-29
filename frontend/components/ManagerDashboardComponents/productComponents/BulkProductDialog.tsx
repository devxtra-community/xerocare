import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  X,
  Upload,
  Save,
  Trash2,
  Plus,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { productService, BulkProductRow } from '@/services/productService';
import { commonService, Vendor, Warehouse } from '@/services/commonService';
import { lotService, Lot, LotItemType } from '@/lib/lot';
import { modelService, Model } from '@/services/modelService';
import { getBrands, Brand } from '@/lib/brand';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface BulkProductDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialLotId?: string;
  initialItemId?: string;
}

/**
 * Dialog component for bulk product uploads via Excel.
 * Parsing Excel files, validating data, and allowing manual adjustments before submission.
 * Supports adding multiple products at once with details like Model, Serial No, Warehouse, etc.
 * Also supports assigning a Lot and selecting a product model from within that lot.
 */
export function BulkProductDialog({
  open,
  onClose,
  onSuccess,
  initialLotId,
  initialItemId,
}: BulkProductDialogProps) {
  const [rows, setRows] = useState<Partial<BulkProductRow>[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const loadDependencies = async () => {
    const [vResult, wResult, lResult, mResult, bResult] = await Promise.allSettled([
      commonService.getAllVendors(),
      commonService.getWarehousesByBranch(),
      lotService.getAllLots(),
      modelService.getAllModels(),
      getBrands(),
    ]);

    if (vResult.status === 'fulfilled') setVendors(vResult.value);
    else if (vResult.status === 'rejected')
      console.error('Failed to load vendors:', vResult.reason);

    if (wResult.status === 'fulfilled') setWarehouses(wResult.value);
    else if (vResult.status === 'rejected')
      console.error('Failed to load warehouses:', wResult.reason);

    if (lResult.status === 'fulfilled') setLots(lResult.value.data || []);
    else if (lResult.status === 'rejected') console.error('Failed to load lots:', lResult.reason);

    if (mResult.status === 'fulfilled') setModels(mResult.value.data || []);
    else if (mResult.status === 'rejected') console.error('Failed to load models:', mResult.reason);

    if (bResult.status === 'fulfilled' && bResult.value.success) setBrands(bResult.value.data);
    else if (bResult.status === 'rejected') console.error('Failed to load brands:', bResult.reason);

    // Only show a toast if vendors AND warehouses both failed (truly broken)
    if (vResult.status === 'rejected' && wResult.status === 'rejected') {
      toast.error('Failed to load dependencies');
    }
  };

  const createEmptyRow = (): Partial<BulkProductRow> => ({
    model_id: '',
    model_no: '',
    warehouse_id: '',
    vendor_id: '',
    product_status: 'AVAILABLE',
    serial_no: '',
    name: '',
    brand: '',
    MFD: '',
    purchase_price: 0,
    sale_price: 0,
    tax_rate: 0,
    print_colour: 'BLACK_WHITE',
    max_discount_amount: 0,
    wholesale_price: 0,
    lot_id: '',
    hs_code: '',
    description: '',
    features: [],
    consumables: [],
  });

  useEffect(() => {
    if (open) {
      setFile(null);
      setExpandedRows({});
      const prepareInitialData = async () => {
        await loadDependencies();

        if (initialLotId) {
          // Find the specific lot and pre-fill rows
          const lotResponse = await lotService.getLotById(initialLotId);
          const lot = lotResponse; // getLotById likely returns the lot directly

          if (lot && lot.items) {
            let itemsToFill = lot.items.filter((item) => item.itemType === LotItemType.MODEL);

            if (initialItemId) {
              itemsToFill = itemsToFill.filter((item) => item.id === initialItemId);
            }

            const newRows: Partial<BulkProductRow>[] = [];
            itemsToFill.forEach((item) => {
              const modelId = item.modelId ?? item.model?.id ?? '';
              const model = models.find((m) => m.id === modelId);
              const brandName =
                model?.brandRelation?.name ||
                model?.brand?.name ||
                item.model?.brandRelation?.name ||
                '';
              const qty = Math.max(0, item.receivedQuantity - item.usedQuantity);
              for (let i = 0; i < qty; i++) {
                newRows.push({
                  ...createEmptyRow(),
                  lot_id: initialLotId,
                  model_id: modelId,
                  model_no: modelId,
                  brand: brandName,
                  vendor_id: lot.vendorId || lot.vendor?.id || '',
                  warehouse_id: lot.warehouseId || lot.warehouse_id || '',
                  purchase_price: Number(item.unitPrice) || 0,
                  sale_price: Number(item.selling_price) || 0,
                  name: item.customProductName || model?.model_name || '',
                  description: model?.description || '',
                });
              }
            });

            setRows(newRows);
          }
        } else {
          setRows([]);
        }
      };

      prepareInitialData();
    }
  }, [open, initialLotId, initialItemId, models]);

  /**
   * Converts an Excel serial date number to a YYYY-MM-DD string.
   * Excel dates are days since 1900-01-01 (with a leap year bug offset).
   */
  const excelSerialToDateString = (serial: number): string => {
    // Excel's epoch is Dec 30, 1899 (accounting for the 1900 leap year bug)
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + serial * 86400000);
    return date.toISOString().split('T')[0];
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
    const newRow = createEmptyRow();
    const newRows = [...rows, newRow];
    setRows(newRows);
    setExpandedRows((prev) => ({
      ...prev,
      [newRows.length - 1]: true,
    }));
  };

  const handleRemoveRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
    setExpandedRows((prev) => {
      const next = { ...prev };
      delete next[index];
      const updatedExpanded: Record<number, boolean> = {};
      Object.keys(next).forEach((k) => {
        const idx = Number(k);
        if (idx > index) {
          updatedExpanded[idx - 1] = next[idx];
        } else {
          updatedExpanded[idx] = next[idx];
        }
      });
      return updatedExpanded;
    });
  };

  const toggleRowExpanded = (index: number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const updateRow = <K extends keyof BulkProductRow>(
    index: number,
    field: K,
    value: BulkProductRow[K],
  ) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  /**
   * When a lot is assigned to a row, clear any prior "select from lot" model choice
   * so the user re-selects the correct model from the new lot.
   */
  const handleLotChange = (index: number, lotId: string) => {
    // '__none__' is the sentinel value for the "None" SelectItem (empty string is not allowed by Radix)
    const resolvedLotId = lotId === '__none__' ? '' : lotId;
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], lot_id: resolvedLotId, model_id: '', name: '' };
    setRows(newRows);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseExcelData = (data: any[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedRows: Partial<BulkProductRow>[] = data.map((row: any) => {
      const getVal = (keys: string[]) => {
        for (const k of keys) {
          if (row[k] !== undefined) return row[k];
          // Try case insensitive match for common variations
          const lowerK = k.toLowerCase().replace(/\s/g, '');
          for (const rowKey of Object.keys(row)) {
            const lowerRowKey = rowKey.toLowerCase().replace(/\s/g, '');
            if (lowerRowKey === lowerK) return row[rowKey];
          }
        }
        return '';
      };

      const rawColour = getVal(['print_colour', 'Print Colour', 'Colour Type', 'Colour'])
        .toString()
        .toLowerCase();
      let printColour: 'BLACK_WHITE' | 'COLOUR' | 'BOTH' = 'BLACK_WHITE';
      if (rawColour.includes('colour') || rawColour.includes('color')) printColour = 'COLOUR';
      if (
        rawColour.includes('both') ||
        (rawColour.includes('black') && rawColour.includes('colour'))
      )
        printColour = 'BOTH';
      if (rawColour === 'bw' || rawColour.includes('black')) printColour = 'BLACK_WHITE';

      const modelId = getVal(['model_no', 'model_id', 'Model No', 'Model ID', 'Model']);

      return {
        model_id: modelId,
        model_no: getVal(['model_no', 'model_id', 'Model No', 'Model ID']),
        serial_no: getVal(['serial_no', 'Serial No', 'Serial', 'Seriel No']),
        name: getVal(['name', 'Name', 'Product Name']),
        brand: getVal(['brand', 'Brand']),
        warehouse_id: getVal(['warehouse_id', 'Warehouse ID', 'Warehouse']),
        vendor_id: getVal(['vendor_id', 'Vendor ID', 'Vendor']),
        product_status: (
          getVal(['product_status', 'Status', 'Product Status']) || 'AVAILABLE'
        ).toUpperCase() as 'AVAILABLE' | 'RENTED' | 'LEASE' | 'SOLD' | 'DAMAGED',
        MFD: (() => {
          const raw = getVal(['MFD', 'mfd', 'Date', 'Date of Manufacture']);
          // Excel stores dates as serial numbers (e.g. 46066). Convert to YYYY-MM-DD.
          if (typeof raw === 'number' && raw > 1000) {
            return excelSerialToDateString(raw);
          }
          // If it's already a string date, return as-is
          return raw ? String(raw).split('T')[0] : '';
        })(),
        purchase_price: Number(getVal(['purchase_price', 'Purchase Price', 'Cost'])) || 0,
        sale_price: Number(getVal(['sale_price', 'Price', 'Sale Price'])) || 0,
        tax_rate: Number(getVal(['tax_rate', 'Tax Rate', 'Tax', 'Tax %'])) || 0,
        print_colour: printColour,
        max_discount_amount:
          Number(
            getVal(['max_discount_amount', 'Max Discount', 'Discount', 'Max Discount Amount']),
          ) || 0,
        wholesale_price: Number(getVal(['wholesale_price', 'Wholesale Price'])) || 0,
        lot_id: getVal(['lot_id', 'Lot ID', 'Lot']),
        hs_code: getVal(['hs_code', 'HS Code', 'HSCODE']),
      };
    });

    if (parsedRows.length === 0) {
      toast.warning('No data found in the file');
    } else {
      setRows(parsedRows);
      toast.success(`Parsed ${parsedRows.length} rows`);
    }
  };

  /**
   * Returns a list of MODEL-type lot items for the lot assigned to a given row.
   */
  const getLotModelItems = (lotId: string) => {
    if (!lotId) return [];
    const lot = lots.find((l) => l.id === lotId);
    if (!lot) return [];
    return lot.items.filter((item) => item.itemType === LotItemType.MODEL);
  };

  const handleSubmit = async () => {
    // Validate rows - require model_id (UUID) to be present
    const validRows = rows.filter(
      (r) => r.model_id && r.warehouse_id && r.vendor_id && r.serial_no && r.name,
    );

    if (validRows.length === 0) {
      toast.error('Please add at least one valid product with a selected Model');
      return;
    }

    // Check for duplicate serial numbers within the submission (backend has a UNIQUE constraint)
    const serials = validRows.map((r) => r.serial_no?.trim() ?? '');
    const duplicateSerials = serials.filter((s, i) => s && serials.indexOf(s) !== i);
    if (duplicateSerials.length > 0) {
      toast.error(`Duplicate serial numbers found: ${[...new Set(duplicateSerials)].join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Backend expects the Model UUID in the 'model_no' field
      const payload = validRows.map((r) => ({
        ...r,
        model_no: r.model_id, // Overwrite with UUID
        lot_id: r.lot_id || undefined, // prevent empty string UUID error
      }));

      const response = await productService.bulkCreateProducts(payload as BulkProductRow[]);
      if (response.success) {
        toast.success(`Successfully added ${response.inserted} products`);
        if (response.failed && response.failed.length > 0) {
          toast.warning(`${response.failed.length} products failed to add`);
        }
        onSuccess();
        onClose();
      }
    } catch {
      toast.error('Bulk upload failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl w-full max-w-[95vw] h-[85vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Upload size={20} /> Bulk Product Upload
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 bg-muted/50 border-b flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 items-center w-full sm:w-auto">
            <div className="relative">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload"
              />
              <label
                htmlFor="excel-upload"
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

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {rows.length > 0 ? (
            rows.map((row, i) => {
              const lotModelItems = getLotModelItems(row.lot_id ?? '');
              const selectedLotItemId = row.model_id
                ? (lotModelItems.find(
                    (item) => item.modelId === row.model_id || item.model?.id === row.model_id,
                  )?.id ?? '')
                : '';

              const isExpanded = !!expandedRows[i];

              // Basic validation checklist
              const isValid = !!(
                row.model_id &&
                row.warehouse_id &&
                row.vendor_id &&
                row.serial_no &&
                row.name
              );

              const lotObj = lots.find((l) => l.id === row.lot_id);

              return (
                <div
                  key={i}
                  className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-card transition-all duration-200 hover:shadow-md"
                >
                  {/* Header / Summary */}
                  <div
                    onClick={() => toggleRowExpanded(i)}
                    className="p-4 bg-slate-50 border-b flex justify-between items-center cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      {isValid ? (
                        <span
                          className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0"
                          title="Valid Product"
                        />
                      ) : (
                        <span
                          className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0"
                          title="Missing required fields"
                        />
                      )}
                      <div className="text-left">
                        <h4 className="font-bold text-sm text-slate-800">
                          Product #{i + 1}:{' '}
                          <span className="text-primary">{row.name || 'Unnamed Product'}</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {row.brand ? `${row.brand}` : 'No Brand'} • Model:{' '}
                          {row.model_id
                            ? models.find((m) => m.id === row.model_id)?.model_name || 'Selected'
                            : 'None'}{' '}
                          • Serial: {row.serial_no || 'N/A'} • Price: ${row.sale_price || 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(i)}
                        className="text-red-500 hover:text-red-700 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Delete Product"
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

                  {/* Body (Form layout) */}
                  {isExpanded && (
                    <div className="p-6 bg-white space-y-6 text-left border-t">
                      {/* Main Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left Column */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <Field label="Assign Lot">
                              <SearchableSelect
                                value={row.lot_id || ''}
                                onValueChange={(v) => handleLotChange(i, v)}
                                options={[
                                  { value: '__none__', label: '— None —' },
                                  ...lots.map((l) => ({ value: l.id, label: l.lotNumber })),
                                ]}
                                placeholder="Select Lot"
                                emptyText="No lots"
                              />
                            </Field>

                            <Field label="Select from Lot">
                              <SearchableSelect
                                value={selectedLotItemId}
                                disabled={!row.lot_id || lotModelItems.length === 0}
                                onValueChange={(v) => {
                                  const item = lotModelItems.find((itm) => itm.id === v);
                                  if (item) {
                                    const modelId = item.modelId || item.model?.id || '';
                                    const modelObj = models.find((m) => m.id === modelId);
                                    const brandName =
                                      modelObj?.brandRelation?.name ||
                                      modelObj?.brand?.name ||
                                      item.model?.brandRelation?.name ||
                                      '';

                                    updateRow(i, 'model_id', modelId);
                                    updateRow(i, 'model_no', modelId);
                                    updateRow(i, 'brand', brandName);
                                    updateRow(
                                      i,
                                      'purchase_price',
                                      Number(item.unitPrice) || row.purchase_price || 0,
                                    );
                                    updateRow(
                                      i,
                                      'sale_price',
                                      Number(item.selling_price) || row.sale_price || 0,
                                    );
                                    updateRow(
                                      i,
                                      'name',
                                      item.customProductName ||
                                        modelObj?.model_name ||
                                        row.name ||
                                        '',
                                    );
                                    updateRow(
                                      i,
                                      'description',
                                      modelObj?.description || row.description || '',
                                    );
                                    updateRow(
                                      i,
                                      'vendor_id',
                                      lotObj?.vendorId || lotObj?.vendor?.id || row.vendor_id || '',
                                    );
                                    updateRow(
                                      i,
                                      'warehouse_id',
                                      lotObj?.warehouseId ||
                                        lotObj?.warehouse_id ||
                                        row.warehouse_id ||
                                        '',
                                    );
                                  }
                                }}
                                options={lotModelItems.map((item) => ({
                                  value: item.id || '',
                                  label: item.model?.model_name || item.modelId || item.id || '',
                                  description:
                                    item.receivedQuantity > 0
                                      ? `(qty: ${item.receivedQuantity - item.usedQuantity})`
                                      : undefined,
                                }))}
                                placeholder={
                                  !row.lot_id
                                    ? 'Select a lot first'
                                    : lotModelItems.length === 0
                                      ? 'No models in lot'
                                      : 'Pick model from lot'
                                }
                                emptyText="No models"
                              />
                            </Field>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <Field label="Brand">
                              <SearchableSelect
                                value={row.brand || ''}
                                onValueChange={(v) => {
                                  const brandObj = brands.find((b) => b.id === v || b.name === v);
                                  updateRow(i, 'brand', brandObj?.name || v || '');
                                  updateRow(i, 'model_id', '');
                                  updateRow(i, 'name', '');
                                }}
                                options={brands.map((b) => ({
                                  value: b.name || '',
                                  label: b.name || '',
                                }))}
                                placeholder="Select Brand"
                                emptyText="No brands"
                              />
                            </Field>

                            <Field label="Model *">
                              <SearchableSelect
                                value={row.model_id || ''}
                                onValueChange={(v) => {
                                  updateRow(i, 'model_id', v);
                                  updateRow(i, 'model_no', v);
                                  const modelObj = models.find((m) => m.id === v);
                                  if (modelObj) {
                                    updateRow(i, 'name', modelObj.model_name || '');
                                    updateRow(i, 'description', modelObj.description || '');
                                  }
                                }}
                                options={models
                                  .filter(
                                    (m) =>
                                      !row.brand ||
                                      m.brandRelation?.name === row.brand ||
                                      m.brand?.name === row.brand,
                                  )
                                  .map((m) => ({
                                    value: m.id || '',
                                    label: `${m.model_no} - ${m.model_name}`,
                                  }))}
                                placeholder="Select Model"
                                emptyText="No models"
                              />
                            </Field>
                          </div>

                          <Field label="Product Name *">
                            <Input
                              value={row.name || ''}
                              onChange={(e) => updateRow(i, 'name', e.target.value)}
                              placeholder="Product Name"
                            />
                          </Field>

                          <Field label="Serial Number *">
                            <Input
                              value={row.serial_no || ''}
                              onChange={(e) => updateRow(i, 'serial_no', e.target.value)}
                              placeholder="Serial Number"
                            />
                          </Field>

                          <div className="grid grid-cols-2 gap-4">
                            <Field label="Warehouse *">
                              <SearchableSelect
                                value={row.warehouse_id || ''}
                                onValueChange={(v) => updateRow(i, 'warehouse_id', v)}
                                options={warehouses.map((w) => ({
                                  value: w.id || '',
                                  label: w.warehouseName || '',
                                }))}
                                placeholder="Select Warehouse"
                                emptyText="No warehouses"
                              />
                            </Field>

                            <Field label="Vendor *">
                              <SearchableSelect
                                value={String(row.vendor_id || '')}
                                onValueChange={(v) => updateRow(i, 'vendor_id', v)}
                                options={vendors.map((v) => ({
                                  value: String(v.id || ''),
                                  label: v.name || '',
                                }))}
                                placeholder="Select Vendor"
                                emptyText="No vendors"
                              />
                            </Field>
                          </div>

                          <Field label="Product Status *">
                            <Select
                              value={row.product_status || 'AVAILABLE'}
                              onValueChange={(v) =>
                                updateRow(
                                  i,
                                  'product_status',
                                  v as BulkProductRow['product_status'],
                                )
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AVAILABLE">Available</SelectItem>
                                <SelectItem value="RENTED">Rented</SelectItem>
                                <SelectItem value="LEASE">Lease</SelectItem>
                                <SelectItem value="SOLD">Sold</SelectItem>
                                <SelectItem value="DAMAGED">Damaged</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <Field label="Purchase Price">
                              <Input
                                type="number"
                                value={row.purchase_price ?? ''}
                                onChange={(e) =>
                                  updateRow(i, 'purchase_price', Number(e.target.value))
                                }
                                placeholder="0"
                              />
                            </Field>
                            <Field label="Sale Price *">
                              <Input
                                type="number"
                                value={row.sale_price ?? ''}
                                onChange={(e) => updateRow(i, 'sale_price', Number(e.target.value))}
                                placeholder="0"
                              />
                            </Field>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <Field label="Wholesale Price">
                              <Input
                                type="number"
                                value={row.wholesale_price ?? ''}
                                onChange={(e) =>
                                  updateRow(i, 'wholesale_price', Number(e.target.value))
                                }
                                placeholder="0"
                              />
                            </Field>
                            <Field label="Tax Rate (%) *">
                              <Input
                                type="number"
                                value={row.tax_rate ?? ''}
                                onChange={(e) => updateRow(i, 'tax_rate', Number(e.target.value))}
                                placeholder="0"
                              />
                            </Field>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <Field label="Date of Manufacture *">
                              <Input
                                type="date"
                                value={
                                  row.MFD
                                    ? row.MFD instanceof Date
                                      ? row.MFD.toISOString().split('T')[0]
                                      : typeof row.MFD === 'number'
                                        ? excelSerialToDateString(row.MFD as number)
                                        : String(row.MFD).split('T')[0]
                                    : ''
                                }
                                onChange={(e) => updateRow(i, 'MFD', e.target.value)}
                              />
                            </Field>
                            <Field label="Print Colour *">
                              <Select
                                value={row.print_colour || 'BLACK_WHITE'}
                                onValueChange={(v) =>
                                  updateRow(i, 'print_colour', v as BulkProductRow['print_colour'])
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Colour" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="BLACK_WHITE">B&W</SelectItem>
                                  <SelectItem value="COLOUR">Colour</SelectItem>
                                  <SelectItem value="BOTH">Both</SelectItem>
                                </SelectContent>
                              </Select>
                            </Field>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <Field label="HS Code">
                              <Input
                                value={row.hs_code || ''}
                                onChange={(e) => updateRow(i, 'hs_code', e.target.value)}
                                placeholder="HS Code"
                              />
                            </Field>
                            <Field label="Max Discount">
                              <Input
                                type="number"
                                value={row.max_discount_amount ?? ''}
                                onChange={(e) =>
                                  updateRow(i, 'max_discount_amount', Number(e.target.value))
                                }
                                placeholder="0"
                              />
                            </Field>
                          </div>

                          <Field label="Product Image">
                            <div className="flex items-center gap-4 border border-input rounded-md p-2 bg-card">
                              {row.imageUrl ? (
                                <div className="relative h-12 w-12 rounded overflow-hidden border group shrink-0">
                                  <img
                                    src={row.imageUrl}
                                    alt="Preview"
                                    className="object-cover h-full w-full"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateRow(i, 'imageUrl', '')}
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                    title="Remove Image"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <div className="h-12 w-12 rounded border flex items-center justify-center text-[10px] text-gray-400 bg-slate-50 shrink-0">
                                  No Image
                                </div>
                              )}
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    try {
                                      const res = await productService.uploadProductImage(file);
                                      if (res.success && res.imageUrl) {
                                        updateRow(i, 'imageUrl', res.imageUrl);
                                        toast.success('Image uploaded successfully');
                                      } else {
                                        toast.error('Image upload failed');
                                      }
                                    } catch (err) {
                                      console.error(err);
                                      toast.error('Failed to upload image');
                                    }
                                  }
                                }}
                                className="h-9 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
                              />
                            </div>
                          </Field>
                        </div>
                      </div>

                      {/* Description Section */}
                      <div className="pt-4 border-t">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                          Product Description
                        </label>
                        <Textarea
                          value={row.description || ''}
                          onChange={(e) => updateRow(i, 'description', e.target.value)}
                          placeholder="Paste product description and details here"
                          className="resize-y min-h-[120px] text-sm leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0 border-slate-200 focus:border-slate-300"
                          rows={4}
                        />
                      </div>

                      {/* Replacement Consumables */}
                      <div className="pt-4 border-t">
                        <div className="flex justify-between items-center mb-4">
                          <label className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                            Replacement Consumables
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const current = row.consumables || [];
                              updateRow(i, 'consumables', [
                                ...current,
                                { partName: '', description: '', yield: '', price: '' },
                              ]);
                            }}
                            className="h-8 text-xs px-3 border-primary text-primary hover:bg-primary/5"
                          >
                            <Plus size={14} className="mr-1.5" /> Add Consumable
                          </Button>
                        </div>

                        {(row.consumables || []).map((consumable, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-50 p-4 rounded-lg mb-4 border border-slate-200 relative group shadow-sm"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const newC = [...(row.consumables || [])];
                                newC.splice(idx, 1);
                                updateRow(i, 'consumables', newC);
                              }}
                              className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors p-1"
                            >
                              <X size={16} />
                            </button>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div>
                                <label className="text-[11px] font-semibold text-slate-500 uppercase mb-1 block">
                                  Part Number
                                </label>
                                <Input
                                  value={consumable.partName}
                                  onChange={(e) => {
                                    const newC = [...(row.consumables || [])];
                                    newC[idx] = { ...newC[idx], partName: e.target.value };
                                    updateRow(i, 'consumables', newC);
                                  }}
                                  placeholder="e.g. C-EV 49 K"
                                  className="h-9 focus:border-primary"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-slate-500 uppercase mb-1 block">
                                  Description
                                </label>
                                <Input
                                  value={consumable.description}
                                  onChange={(e) => {
                                    const newC = [...(row.consumables || [])];
                                    newC[idx] = { ...newC[idx], description: e.target.value };
                                    updateRow(i, 'consumables', newC);
                                  }}
                                  placeholder="e.g. Black Toner"
                                  className="h-9 focus:border-primary"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-slate-500 uppercase mb-1 block">
                                  Yield
                                </label>
                                <Input
                                  value={consumable.yield}
                                  onChange={(e) => {
                                    const newC = [...(row.consumables || [])];
                                    newC[idx] = { ...newC[idx], yield: e.target.value };
                                    updateRow(i, 'consumables', newC);
                                  }}
                                  placeholder="e.g. 36000 pages"
                                  className="h-9 focus:border-primary"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-slate-500 uppercase mb-1 block">
                                  Price
                                </label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={consumable.price}
                                  onChange={(e) => {
                                    const newC = [...(row.consumables || [])];
                                    newC[idx] = { ...newC[idx], price: e.target.value };
                                    updateRow(i, 'consumables', newC);
                                  }}
                                  placeholder="e.g. 390.00"
                                  className="h-9 focus:border-primary"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!row.consumables || row.consumables.length === 0) && (
                          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                            <p className="text-xs text-slate-400">
                              No replacement consumables added yet.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Key Features */}
                      <div className="pt-4 border-t">
                        <div className="flex justify-between items-center mb-4">
                          <label className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                            Key Features
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const current = row.features || [];
                              updateRow(i, 'features', [
                                ...current,
                                { subHeading: '', description: '' },
                              ]);
                            }}
                            className="h-8 text-xs px-3 border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                          >
                            <Plus size={14} className="mr-1.5" /> Add Feature
                          </Button>
                        </div>

                        {(row.features || []).map((feature, idx) => (
                          <div
                            key={idx}
                            className="bg-emerald-50/30 p-4 rounded-lg mb-4 border border-emerald-100 relative group shadow-sm"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const newF = [...(row.features || [])];
                                newF.splice(idx, 1);
                                updateRow(i, 'features', newF);
                              }}
                              className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors p-1"
                            >
                              <X size={16} />
                            </button>
                            <div className="space-y-3">
                              <div>
                                <label className="text-[11px] font-semibold text-emerald-700 uppercase mb-1 block">
                                  Sub Heading
                                </label>
                                <Input
                                  value={feature.subHeading}
                                  onChange={(e) => {
                                    const newF = [...(row.features || [])];
                                    newF[idx] = { ...newF[idx], subHeading: e.target.value };
                                    updateRow(i, 'features', newF);
                                  }}
                                  placeholder="e.g. Speed"
                                  className="h-9 focus:border-emerald-500"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-emerald-700 uppercase mb-1 block">
                                  Description
                                </label>
                                <Textarea
                                  value={feature.description}
                                  onChange={(e) => {
                                    const newF = [...(row.features || [])];
                                    newF[idx] = { ...newF[idx], description: e.target.value };
                                    updateRow(i, 'features', newF);
                                  }}
                                  placeholder="e.g. 30 ppm print speed for high productivity"
                                  className="resize-none min-h-[60px] text-sm focus:border-emerald-500"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!row.features || row.features.length === 0) && (
                          <div className="text-center py-6 border-2 border-dashed border-emerald-100 rounded-lg">
                            <p className="text-xs text-emerald-400">
                              No special features added yet.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
              <Upload size={48} className="mb-4 opacity-20" />
              <p>Upload an Excel file to view and edit products here</p>
              <p className="text-sm">or click &quot;Add Row&quot; to start manually</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-between items-center bg-muted/50">
          <Button variant="outline" onClick={handleAddRow} className="gap-2">
            <Plus size={16} /> Add Row
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rows.length === 0 || isSubmitting}
              className="gap-2 bg-primary text-white min-w-[110px]"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} /> Save All
                </>
              )}
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
