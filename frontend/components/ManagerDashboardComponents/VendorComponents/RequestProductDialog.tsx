import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, UploadCloud } from 'lucide-react';
import { Vendor } from '@/components/AdminDahboardComponents/VendorComponents/VendorTable';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface RequestProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor | null;
  onConfirm: (data: { products: string; message: string }) => Promise<void>;
}

/**
 * Dialog to request specific products from a vendor.
 * Captures product list and optional message to be sent to the vendor.
 */
export default function RequestProductDialog({
  open,
  onOpenChange,
  vendor,
  onConfirm,
}: RequestProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState('');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConfirm = async () => {
    if (!products.trim()) return;
    setLoading(true);
    try {
      await onConfirm({ products, message });
      setProducts('');
      setMessage('');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Assume first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Parse rows to text list
        let parsedText = '';
        jsonData.forEach((row: unknown) => {
          if (Array.isArray(row) && row.length > 0) {
            // Join columns with space and ignore empty columns
            const rowText = row.filter(Boolean).join(' - ');
            if (rowText) {
              parsedText += `- ${rowText}\n`;
            }
          }
        });

        if (parsedText.trim()) {
          // Append to existing products or replace if empty
          setProducts((prev) =>
            prev.trim() ? `${prev}\n\n${parsedText.trim()}` : parsedText.trim(),
          );
          toast.success('Excel data imported successfully!');
        } else {
          toast.error('Could not find readable data in the Excel file.');
        }
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast.error('Failed to parse Excel file. Ensure it is a valid .xlsx or .xls file.');
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read the file.');
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-primary">
            <Send size={20} /> Request Products from {vendor?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center w-full">
              <Label htmlFor="products">
                Product List <span className="text-red-500">*</span>
              </Label>

              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud size={14} />
                Upload Excel
              </Button>
            </div>

            <Textarea
              id="products"
              placeholder="e.g. 10x HP Toner Cartridges&#10;5x Samsung Monitors&#10;&#10;Or click 'Upload Excel' to parse a sheet."
              value={products}
              onChange={(e) => setProducts(e.target.value)}
              className="min-h-[140px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Any additional instructions..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!products.trim() || loading}
            className="bg-primary hover:bg-primary/90 gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
