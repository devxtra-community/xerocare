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
import { sparePartService } from '@/services/sparePartService'; // Typo fix
import { warehouseService, Warehouse } from '@/services/warehouseService';
import { modelService } from '@/services/modelService';
import { vendorService } from '@/services/vendorService';
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
}

export default function BulkSparePartDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkSparePartDialogProps) {
  const [rows, setRows] = useState<Partial<BulkSparePartRow>[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [models, setModels] = useState<{ id: string; model_name: string }[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [file, setFile] = useState<File | null>(null);

  const loadDependencies = async () => {
    try {
      const [v, w, m] = await Promise.all([
        vendorService.getVendors(),
        warehouseService.getWarehouses(),
        modelService.getAllModels(),
      ]);
      setVendors(v || []);
      setWarehouses(w || []);
      setModels(m || []);
    } catch {
      toast.error('Failed to load dependencies');
    }
  };

  useEffect(() => {
    if (open) {
      setRows([]);
      setFile(null);
      loadDependencies();
    }
  }, [open]);

  const createEmptyRow = (): Partial<BulkSparePartRow> => ({
    item_code: '',
    part_name: '',
    brand: '',
    model_id: '',
    base_price: 0,
    quantity: 0,
    vendor_id: '',
    warehouse_id: '',
  });

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
        }
        return '';
      };

      const rawModel = getVal(['model_id', 'Model ID', 'Model', 'Compatible Model']);
      const rawVendor = getVal(['vendor_id', 'Vendor ID', 'Vendor']);
      const rawWarehouse = getVal(['warehouse_id', 'Warehouse ID', 'Warehouse']);

      return {
        item_code: getVal(['item_code', 'Item Code', 'ItemCode']),
        part_name: getVal(['part_name', 'Item Name', 'Name']),
        brand: getVal(['brand', 'Brand']),
        model_id: findIdByName(rawModel, models),
        base_price: Number(getVal(['base_price', 'Price']))!,
        quantity: Number(getVal(['quantity', 'Quantity', 'Qty']))!,
        vendor_id: findIdByName(rawVendor, vendors),
        warehouse_id: findIdByName(rawWarehouse, warehouses),
      };
    });

    if (parsedRows.length === 0) {
      toast.warning('No data found in the file');
    } else {
      setRows(parsedRows);
      toast.success(`Parsed ${parsedRows.length} rows`);
    }
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
    // Validate rows - require item_code
    const validRows = rows.filter((r) => r.item_code);

    if (validRows.length === 0) {
      toast.error('Please add at least one valid spare part with Item Code');
      return;
    }

    try {
      // Cast quantity and price to numbers to be sure
      const payload = validRows.map((r) => ({
        ...r,
        // If model_id is empty string or 'universal', make it undefined
        model_id: !r.model_id || r.model_id === 'universal' ? undefined : r.model_id,
        base_price: Number(r.base_price),
        quantity: Number(r.quantity),
      }));

      // sparePartService.bulkUpload type definition matches payload
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl">
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

        <div className="p-4 bg-gray-50 border-b flex flex-col sm:flex-row gap-4 items-center justify-between">
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
          <div className="text-sm text-gray-500">
            {rows.length > 0 ? `${rows.length} rows loaded` : 'Upload an Excel file to get started'}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">
                    Item Code <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="w-[150px]">
                    Part Name <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="w-[120px]">
                    Brand <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="w-[100px]">Price</TableHead>
                  <TableHead className="w-[80px]">Qty</TableHead>
                  <TableHead className="w-[150px]">Vendor (for Qty)</TableHead>
                  <TableHead className="w-[150px]">Warehouse</TableHead>
                  <TableHead className="w-[150px]">Model</TableHead>
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
                        placeholder="Item Code"
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
                      <Select
                        value={row.model_id}
                        onValueChange={(v) => updateRow(i, 'model_id', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Universal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="universal">Universal</SelectItem>
                          {models.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.model_name}
                            </SelectItem>
                          ))}
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

        <div className="p-4 border-t flex justify-between items-center bg-gray-50">
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
