'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Purchase, PurchaseItem, createPurchase, updatePurchase } from '@/lib/purchase';
import { getVendors, Vendor } from '@/lib/vendor';
import { toast } from 'sonner';
import { Plus, Trash2, Save } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AddPurchaseDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData: Purchase | null;
}

export function AddPurchaseDialog({
  open,
  onClose,
  onSuccess,
  initialData,
}: AddPurchaseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Form State
  const [purchaseNumber, setPurchaseNumber] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [status, setStatus] = useState<'PENDING' | 'COMPLETED' | 'CANCELLED'>('PENDING');
  const [items, setItems] = useState<PurchaseItem[]>([]);

  useEffect(() => {
    if (open) {
      loadVendors();
      if (initialData) {
        setPurchaseNumber(initialData.purchaseNumber);
        setLotNumber(initialData.lotNumber);
        setVendorId(initialData.vendorId);
        setStatus(initialData.status);
        setItems(initialData.items || []);
      } else {
        resetForm();
      }
    }
  }, [open, initialData]);

  const loadVendors = async () => {
    try {
      const data = await getVendors();
      setVendors(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load vendors');
    }
  };

  const resetForm = () => {
    setPurchaseNumber('');
    setLotNumber('');
    setVendorId('');
    setStatus('PENDING');
    setItems([]);
  };

  const addItem = () => {
    setItems([...items, { productName: '', modelName: '', quantity: 1, unitCost: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PurchaseItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotalCost = () => {
    return items.reduce(
      (sum, item) => sum + (Number(item.quantity) * Number(item.unitCost) || 0),
      0,
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseNumber || !lotNumber || !vendorId || items.length === 0) {
      toast.error('Please fill in all required fields and add at least one product.');
      return;
    }

    setLoading(true);
    try {
      const selectedVendor = vendors.find((v) => v.id === vendorId);
      const totalCost = calculateTotalCost();

      const payload: Partial<Purchase> = {
        purchaseNumber,
        lotNumber,
        vendorId,
        vendorName: selectedVendor?.name || '',
        vendorEmail: selectedVendor?.email || '',
        status,
        totalCost,
        items,
        date: new Date().toISOString(),
      };

      if (initialData) {
        await updatePurchase(initialData.id, payload);
        toast.success('Purchase updated successfully');
      } else {
        await createPurchase(payload);
        toast.success('Purchase created successfully');
      }
      onSuccess();
      onClose();
    } catch {
      toast.error('Failed to save purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary">
            {initialData ? 'Update Purchase' : 'Add New Purchase'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 overflow-y-auto pr-2">
          {/* Top Section: Purchase Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Purchase Number</label>
              <Input
                placeholder="PUR-001"
                value={purchaseNumber}
                onChange={(e) => setPurchaseNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Lot Number</label>
              <Input
                placeholder="LOT-2024-X"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Vendor</label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
              <Select
                value={status}
                onValueChange={(val) => setStatus(val as 'PENDING' | 'COMPLETED' | 'CANCELLED')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Middle Section: Products */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg text-gray-800">Products</h3>
              <Button type="button" onClick={addItem} size="sm" variant="outline" className="gap-2">
                <Plus size={16} /> Add Product
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[200px]">Product Name</TableHead>
                    <TableHead className="w-[150px]">Model</TableHead>
                    <TableHead className="w-[100px]">Qty</TableHead>
                    <TableHead className="w-[120px]">Unit Cost</TableHead>
                    <TableHead className="w-[100px] text-right">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length > 0 ? (
                    items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={item.productName}
                            onChange={(e) => updateItem(index, 'productName', e.target.value)}
                            placeholder="Name"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.modelName}
                            onChange={(e) => updateItem(index, 'modelName', e.target.value)}
                            placeholder="Model"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={item.unitCost}
                            onChange={(e) => updateItem(index, 'unitCost', Number(e.target.value))}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{(item.quantity * item.unitCost).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-gray-400">
                        No products added. Click "Add Product" to start.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Bottom Section: Summary & Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t mt-auto">
            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium text-gray-600">Total Estimated Cost:</span>
              <span className="text-2xl font-bold text-primary">
                ₹{calculateTotalCost().toLocaleString()}
              </span>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-none gap-2 bg-primary text-white"
              >
                <Save size={16} />
                {loading ? 'Saving...' : 'Save Purchase'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
