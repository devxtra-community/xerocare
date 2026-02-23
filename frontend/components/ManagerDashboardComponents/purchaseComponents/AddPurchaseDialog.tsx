'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { purchaseService, CreatePurchaseDTO } from '@/services/purchaseService';
import { toast } from 'sonner';

interface AddPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/**
 * Dialog component for recording a new purchase.
 * Captures purchase number, lot reference, vendor, total amount, and status.
 */
export default function AddPurchaseDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddPurchaseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreatePurchaseDTO>({
    purchase_number: '',
    lot_number: '',
    product_ids: [],
    model_ids: [],
    vendor_id: '',
    total_amount: 0,
    status: 'PENDING',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await purchaseService.createPurchase(formData);
      toast.success('Purchase created successfully');
      setFormData({
        purchase_number: '',
        lot_number: '',
        product_ids: [],
        model_ids: [],
        vendor_id: '',
        total_amount: 0,
        status: 'PENDING',
      });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error('Failed to create purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Purchase</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchase_number">Purchase Number</Label>
              <Input
                id="purchase_number"
                value={formData.purchase_number}
                onChange={(e) => setFormData({ ...formData, purchase_number: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot_number">Lot Number</Label>
              <Input
                id="lot_number"
                value={formData.lot_number}
                onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor ID</Label>
            <Input
              id="vendor"
              value={formData.vendor_id}
              onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
              placeholder="Enter Vendor ID"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_amount">Total Amount</Label>
              <Input
                id="total_amount"
                type="number"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'PENDING' | 'COMPLETED' | 'CANCELLED') =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Note: Product and Model selection are simplified for this example. 
               In a real app, you'd likely use a multi-select component fetching from products/models APIs.
           */}

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Purchase'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
