import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Upload, Save, Trash2, Plus, FileSpreadsheet, Download } from 'lucide-react';
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
        commonService.getAllWarehouses(),
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
  });

  const handleDownloadTemplate = () => {
    const headers = [
      'model_no',
      'warehouse_id',
      'vendor_id',
      'serial_no',
      'name',
      'brand',
      'MFD',
      'rent_price_monthly',
      'rent_price_yearly',
      'lease_price_monthly',
      'lease_price_yearly',
      'sale_price',
      'tax_rate',
    ];
    const data = [
      [
        'MOD-ID-123',
        'WH-ID-123',
        'VEN-ID-123',
        'SN-001',
        'Product Name',
        'Brand Name',
        '2024-01-01',
        0,
        0,
        0,
        0,
        100,
        10,
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'bulk_product_template.xlsx');
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

      return {
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
    // Validate rows
    const validRows = rows.filter(
      (r) => r.model_no && r.warehouse_id && r.vendor_id && r.serial_no && r.name,
    );

    if (validRows.length === 0) {
      toast.error('Please add at least one valid product');
      return;
    }

    try {
      const response = await productService.bulkCreateProducts(validRows as BulkProductRow[]);
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
      <div className="bg-white rounded-xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Upload size={20} /> Bulk Product Upload
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
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
            <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
              <Download size={18} /> Template
            </Button>
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
                    Model ID <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="w-[120px]">
                    Serial No <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="w-[150px]">
                    Name <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="w-[120px]">Brand</TableHead>
                  <TableHead className="w-[150px]">
                    Warehouse <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="w-[150px]">
                    Vendor <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[120px]">MFD</TableHead>
                  <TableHead className="w-[100px]">Price</TableHead>
                  <TableHead className="w-[80px]">Tax %</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Input
                        value={row.model_no}
                        onChange={(e) => updateRow(i, 'model_no', e.target.value)}
                        placeholder="Model ID"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.serial_no}
                        onChange={(e) => updateRow(i, 'serial_no', e.target.value)}
                        placeholder="Serial #"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.name}
                        onChange={(e) => updateRow(i, 'name', e.target.value)}
                        placeholder="Product Name"
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
                              {w.warehouse_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                            <SelectItem key={v.id} value={String(v.id)}>
                              {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.product_status}
                        onValueChange={(v) => updateRow(i, 'product_status', v)}
                      >
                        <SelectTrigger>
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
                    <TableCell>
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
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.sale_price}
                        onChange={(e) => updateRow(i, 'sale_price', Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.tax_rate}
                        onChange={(e) => updateRow(i, 'tax_rate', Number(e.target.value))}
                      />
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
              <p>Upload an Excel file to view and edit products here</p>
              <p className="text-sm">or click &quot;Add Row&quot; to start manually</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-between items-center bg-gray-50">
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
