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
import { productService, BulkProductRow } from '@/services/productService';
import { commonService, Vendor, Warehouse } from '@/services/commonService';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface BulkProductDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Dialog component for bulk product uploads via Excel.
 * Parsing Excel files, validating data, and allowing manual adjustments before submission.
 * Supports adding multiple products at once with details like Model, Serial No, Warehouse, etc.
 */
export function BulkProductDialog({ open, onClose, onSuccess }: BulkProductDialogProps) {
  const [rows, setRows] = useState<Partial<BulkProductRow>[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [file, setFile] = useState<File | null>(null);

  const loadDependencies = async () => {
    try {
      const [v, w] = await Promise.all([
        commonService.getAllVendors(),
        commonService.getWarehousesByBranch(),
      ]);
      setVendors(v);
      setWarehouses(w);
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
    sale_price: 0,
    tax_rate: 0,
    print_colour: 'BLACK_WHITE',
    max_discount_amount: 0,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseExcelData = (data: any[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedRows: Partial<BulkProductRow>[] = data.map((row: any) => {
      const getVal = (keys: string[]) => {
        for (const k of keys) {
          if (row[k] !== undefined) return row[k];
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

      return {
        model_id: getVal(['model_no', 'model_id', 'Model No', 'Model ID', 'Model']),
        model_no: getVal(['model_no', 'model_id', 'Model No', 'Model ID']),
        serial_no: getVal(['serial_no', 'Serial No', 'Serial']),
        name: getVal(['name', 'Name', 'Product Name']),
        brand: getVal(['brand', 'Brand']),
        warehouse_id: getVal(['warehouse_id', 'Warehouse ID', 'Warehouse']),
        vendor_id: getVal(['vendor_id', 'Vendor ID', 'Vendor']),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        product_status: (getVal(['product_status', 'Status']) || 'AVAILABLE').toUpperCase() as any,
        MFD: getVal(['MFD', 'mfd', 'Date']),
        sale_price: Number(getVal(['sale_price', 'Price'])) || 0,
        tax_rate: Number(getVal(['tax_rate', 'Tax Rate', 'Tax'])) || 0,
        print_colour: printColour,
        max_discount_amount:
          Number(getVal(['max_discount_amount', 'Max Discount', 'Discount'])) || 0,
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
  const updateRow = (index: number, field: keyof BulkProductRow, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
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

    try {
      // Backend expects the Model UUID in the 'model_no' field
      const payload = validRows.map((r) => ({
        ...r,
        model_no: r.model_id, // Overwrite with UUID
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
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl">
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

        <div className="flex-1 overflow-x-auto p-4">
          {rows.length > 0 ? (
            <div className="min-w-max">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">
                      Model <span className="text-red-500">*</span>
                    </TableHead>
                    <TableHead className="min-w-[150px]">
                      Serial No <span className="text-red-500">*</span>
                    </TableHead>
                    <TableHead className="min-w-[180px]">
                      Name <span className="text-red-500">*</span>
                    </TableHead>
                    <TableHead className="min-w-[140px]">Brand</TableHead>
                    <TableHead className="min-w-[180px]">
                      Warehouse <span className="text-red-500">*</span>
                    </TableHead>
                    <TableHead className="min-w-[180px]">
                      Vendor <span className="text-red-500">*</span>
                    </TableHead>
                    <TableHead className="min-w-[130px]">Status</TableHead>
                    <TableHead className="min-w-[150px]">MFD</TableHead>
                    <TableHead className="min-w-[120px]">Price</TableHead>
                    <TableHead className="min-w-[100px]">Tax %</TableHead>
                    <TableHead className="min-w-[140px]">Print Colour</TableHead>
                    <TableHead className="min-w-[130px]">Max Discount</TableHead>
                    <TableHead className="min-w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="min-w-[200px]">
                        <Input
                          value={row.model_id}
                          onChange={(e) => updateRow(i, 'model_id', e.target.value)}
                          placeholder="Model ID"
                          className="min-w-full"
                        />
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        <Input
                          value={row.serial_no}
                          onChange={(e) => updateRow(i, 'serial_no', e.target.value)}
                          placeholder="Serial #"
                          className="min-w-full"
                        />
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        <Input
                          value={row.name}
                          onChange={(e) => updateRow(i, 'name', e.target.value)}
                          placeholder="Product Name"
                          className="min-w-full"
                        />
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <Input
                          value={row.brand}
                          onChange={(e) => updateRow(i, 'brand', e.target.value)}
                          placeholder="Brand"
                          className="min-w-full"
                        />
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        <Select
                          value={row.warehouse_id}
                          onValueChange={(v) => updateRow(i, 'warehouse_id', v)}
                        >
                          <SelectTrigger className="min-w-full">
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
                      <TableCell className="min-w-[180px]">
                        <Select
                          value={String(row.vendor_id)}
                          onValueChange={(v) => updateRow(i, 'vendor_id', v)}
                        >
                          <SelectTrigger className="min-w-full">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendors.map((v) => (
                              <SelectItem key={v.id} value={String(v.id)}>
                                {v.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="min-w-[130px]">
                        <Select
                          value={row.product_status}
                          onValueChange={(v) => updateRow(i, 'product_status', v)}
                        >
                          <SelectTrigger className="min-w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AVAILABLE">Available</SelectItem>
                            <SelectItem value="RENTED">Rented</SelectItem>
                            <SelectItem value="LEASE">Lease</SelectItem>
                            <SelectItem value="SOLD">Sold</SelectItem>
                            <SelectItem value="DAMAGED">Damaged</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        <Input
                          type="date"
                          value={
                            row.MFD
                              ? row.MFD instanceof Date
                                ? row.MFD.toISOString().split('T')[0]
                                : String(row.MFD).split('T')[0]
                              : ''
                          }
                          onChange={(e) => updateRow(i, 'MFD', e.target.value)}
                          className="min-w-full"
                        />
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <Input
                          type="number"
                          value={row.sale_price}
                          onChange={(e) => updateRow(i, 'sale_price', Number(e.target.value))}
                          className="min-w-full"
                        />
                      </TableCell>
                      <TableCell className="min-w-[100px]">
                        <Input
                          type="number"
                          value={row.tax_rate}
                          onChange={(e) => updateRow(i, 'tax_rate', Number(e.target.value))}
                          className="min-w-full"
                        />
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <Select
                          value={row.print_colour}
                          onValueChange={(v) => updateRow(i, 'print_colour', v)}
                        >
                          <SelectTrigger className="min-w-full">
                            <SelectValue placeholder="Colour" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BLACK_WHITE">B&W</SelectItem>
                            <SelectItem value="COLOUR">Colour</SelectItem>
                            <SelectItem value="BOTH">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="min-w-[130px]">
                        <Input
                          type="number"
                          value={row.max_discount_amount}
                          onChange={(e) =>
                            updateRow(i, 'max_discount_amount', Number(e.target.value))
                          }
                          placeholder="0"
                          className="min-w-full"
                        />
                      </TableCell>
                      <TableCell className="min-w-[60px]">
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
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
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
            <Button variant="ghost" onClick={onClose}>
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
