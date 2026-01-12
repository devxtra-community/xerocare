'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { bulkCreateProducts } from '@/lib/product';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface BulkUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkUploadModal({ onClose, onSuccess }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    try {
      const data = await parseExcel(selectedFile);
      setPreviewData(data.slice(0, 5)); // Preview first 5 rows
    } catch {
      setError('Failed to parse Excel file');
      setFile(null);
      setPreviewData([]);
    }
  };

  const parseExcel = (file: File): Promise<Record<string, unknown>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      const data = await parseExcel(file);

      // Basic validation or mapping could go here
      // Expected fields: name, model_no, serial_no, vendor_id, etc.

      const result = await bulkCreateProducts(data);

      if (result.successCount > 0) {
        toast.success(`Successfully added ${result.successCount} products`);
        if (result.failedRows.length > 0) {
          toast.warning(`${result.failedRows.length} rows failed to upload`);
          // Ideally show a report of failed rows
        }
        onSuccess();
        onClose();
      } else {
        toast.error('Failed to add any products. Check data format.');
        setError(`Failed rows: ${result.failedRows.map((f) => f.row).join(', ')}`);
      }
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast.error(message);
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-semibold text-blue-900">Bulk Upload Products</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 flex-1">
          {!file ? (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition relative">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileSpreadsheet className="h-12 w-12 text-gray-400 mb-3" />
              <p className="font-medium text-gray-700">Click or drag Excel file here</p>
              <p className="text-sm text-gray-500 mt-1">Supports .xlsx and .xls</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">{file.name}</p>
                    <p className="text-xs text-blue-700 text-opacity-80">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreviewData([]);
                    setError(null);
                  }}
                  className="text-gray-500 hover:text-red-500"
                >
                  <X size={18} />
                </button>
              </div>

              {previewData.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 border-b text-xs font-semibold text-gray-500">
                    Preview (First 5 rows)
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(previewData[0] || {})
                            .slice(0, 5)
                            .map((header) => (
                              <TableHead key={header} className="whitespace-nowrap">
                                {header}
                              </TableHead>
                            ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row, i) => (
                          <TableRow key={i}>
                            {Object.values(row)
                              .slice(0, 5)
                              .map((val, j) => (
                                <TableCell key={j} className="whitespace-nowrap">
                                  {String(val)}
                                </TableCell>
                              ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading || !!error}
            className="gap-2"
          >
            {isUploading ? (
              'Uploading...'
            ) : (
              <>
                <Upload size={16} /> Upload
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
