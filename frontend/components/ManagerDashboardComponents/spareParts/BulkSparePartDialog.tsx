'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { sparePartService } from '@/services/sparePartService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { warehouseService, Warehouse } from '@/services/warehouseService';
import { getUserFromToken } from '@/lib/auth';

interface BulkSparePartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function BulkSparePartDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkSparePartDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  useEffect(() => {
    if (open) {
      fetchWarehouses();
    }
  }, [open]);

  const fetchWarehouses = async () => {
    setLoadingWarehouses(true);
    try {
      const user = getUserFromToken();
      const data = await warehouseService.getWarehouses();
      // Filter warehouses by user's branch if available
      const filtered = user?.branchId
        ? data.filter((w) => w.branchId === user.branchId && w.status === 'ACTIVE')
        : data.filter((w) => w.status === 'ACTIVE');
      setWarehouses(filtered);
    } catch (error) {
      console.error('Failed to fetch warehouses', error);
      toast.error('Failed to load warehouses');
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
      setPreviewData(jsonData);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    if (!file || previewData.length === 0) return;

    setUploading(true);
    try {
      // Mapping
      // Mapping
      const mappedData = previewData.map((row) => ({
        item_code: String(row['Item Code'] || row['item_code'] || ''),
        part_name: String(row['Item Name'] || row['Name'] || row['part_name'] || ''),
        brand: String(row['Brand'] || row['brand'] || ''),
        model_id: String(row['Model ID'] || row['model_id'] || ''),
        base_price: Number(row['Price'] || row['base_price'] || 0),
        warehouse_id: String(
          row['Warehouse ID'] || row['warehouse_id'] || selectedWarehouseId || '',
        ),
        vendor_id: String(row['Vendor ID'] || row['vendor_id'] || ''),
        quantity: Number(row['Quantity'] || row['quantity'] || 0),
      }));

      // Validation
      const validRows = mappedData.filter((r) => r.item_code && r.warehouse_id && r.quantity);

      if (validRows.length === 0) {
        toast.error(
          'No valid rows found. Ensure Item Code, Quantity, and Warehouse (selected or in file) are present.',
        );
        setUploading(false);
        return;
      }

      const result = await sparePartService.bulkUpload(validRows);

      if (result.success) {
        toast.success(`Successfully uploaded ${result.data.success} spare parts.`);
        if (result.data.failed > 0) {
          toast.warning(`${result.data.failed} items failed to upload.`);
        }
        onSuccess();
        onOpenChange(false);
        setFile(null);
        setPreviewData([]);
        setSelectedWarehouseId('');
      } else {
        toast.error('Upload failed.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Upload Spare Parts</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="warehouse">Target Warehouse</Label>
            <Select
              value={selectedWarehouseId}
              onValueChange={setSelectedWarehouseId}
              disabled={loadingWarehouses}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingWarehouses ? 'Loading...' : 'Select Warehouse'} />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((wh) => (
                  <SelectItem key={wh.id} value={wh.id}>
                    {wh.warehouseName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[0.8rem] text-muted-foreground">
              Selected warehouse will be used if &quot;Warehouse ID&quot; column is missing in file.
            </p>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              {file ? (
                <>
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-gray-500">{previewData.length} rows detected</span>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="text-sm text-gray-600">Click to upload .xlsx file</span>
                </>
              )}
            </label>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p className="font-semibold">Required Columns:</p>
            <ul className="list-disc pl-4 grid grid-cols-2 gap-x-4">
              <li>Item Code</li>
              <li>Quantity</li>
              <li>Item Name</li>
              <li>Price</li>
              <li>Brand</li>
              <li>Warehouse ID (Optional if selected above)</li>
              <li>Model ID (Optional)</li>
              <li>Vendor ID (Optional)</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={
              !file ||
              uploading ||
              (!selectedWarehouseId &&
                !previewData.some((r) => r['Warehouse ID'] || r['warehouse_id']))
            }
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
